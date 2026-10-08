const bcrypt = require('bcryptjs');
const { q } = require('./db');
const TABLES = [
  'users(id serial primary key, name text, email text unique, password text, role text)',
  'classes(id serial primary key, name text)',
  'teachers(id serial primary key, name text, subject text, user_id integer)',
  'students(id serial primary key, name text, roll text unique, class_id integer, user_id integer, parent_user_id integer)',
  'attendance(id serial primary key, student_id integer, day text, status text)',
  'marks(id serial primary key, student_id integer, subject text, exam text, score integer, total integer)',
  'fees(id serial primary key, student_id integer, title text, amount integer, due text, paid boolean default false, paid_on text)',
  'timetable(id serial primary key, class_id integer, day text, period integer, subject text, teacher text)',
];
const DEMO = process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO === 'true';
const hash = (p) => bcrypt.hashSync(p, 8);
const mkUser = async (name, email, role, pw = 'pass123') =>
  (await q('insert into users(name,email,password,role) values($1,$2,$3,$4) returning id', [name, email, hash(pw), role]))[0].id;
const dayAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

async function init() {
  for (const t of TABLES) await q(`create table if not exists ${t}`);
  if ((await q('select id from users limit 1')).length) return;
  if (!DEMO) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) before the first start in production.');
    await mkUser('Admin', ADMIN_EMAIL.toLowerCase().trim(), 'admin', ADMIN_PASSWORD);
    return;
  }
  await mkUser('Admin', 'admin@uni.edu', 'admin', 'admin123');
  const tid = await mkUser('Prof. Sharma', 't.sharma@uni.edu', 'teacher');
  await q('insert into teachers(name,subject,user_id) values($1,$2,$3)', ['Prof. Sharma', 'Mathematics', tid]);
  const classes = [];
  for (const n of ['CSE-A', 'CSE-B']) classes.push((await q('insert into classes(name) values($1) returning id', [n]))[0].id);
  const names = ['Aarav Mehta', 'Diya Nair', 'Rohan Iyer', 'Sneha Kapoor', 'Kabir Singh', 'Meera Pillai'];
  const subjects = ['Mathematics', 'Physics', 'Programming', 'English'];
  for (let i = 0; i < names.length; i++) {
    const roll = 'cs' + (101 + i);
    const su = await mkUser(names[i], roll + '@uni.edu', 'student');
    const pu = await mkUser('Parent of ' + names[i], 'parent.' + roll + '@uni.edu', 'parent');
    const sid = (await q('insert into students(name,roll,class_id,user_id,parent_user_id) values($1,$2,$3,$4,$5) returning id',
      [names[i], roll, classes[i % 2], su, pu]))[0].id;
    for (let d = 1; d <= 24; d++) {
      const v = (i * 3 + d) % 10;
      await q('insert into attendance(student_id,day,status) values($1,$2,$3)', [sid, dayAgo(d), v === 0 ? 'Absent' : v === 1 ? 'Late' : 'Present']);
    }
    for (let j = 0; j < subjects.length; j++)
      await q('insert into marks(student_id,subject,exam,score,total) values($1,$2,$3,$4,$5)', [sid, subjects[j], 'Midterm', 55 + ((i * 13 + j * 7) % 45), 100]);
    await q('insert into fees(student_id,title,amount,due,paid,paid_on) values($1,$2,$3,$4,$5,$6)',
      [sid, 'Tuition - Semester 1', 45000, dayAgo(-15), i % 2 === 0, i % 2 === 0 ? dayAgo(5) : null]);
  }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let d = 0; d < 5; d++) for (let p = 1; p <= 3; p++)
    await q('insert into timetable(class_id,day,period,subject,teacher) values($1,$2,$3,$4,$5)', [classes[0], days[d], p, subjects[(d + p) % 4], 'Prof. Sharma']);
}
module.exports = { init, mkUser, DEMO };
