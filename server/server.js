require('dotenv').config();
const express = require('express'), cors = require('cors'), jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs');
const path = require('path'), fs = require('fs');
const { q } = require('./db');
const { init, mkUser, DEMO } = require('./schema');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) { console.error('Set JWT_SECRET before running in production.'); process.exit(1); }
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express();
app.set('trust proxy', 1);
app.use(cors(), express.json({ limit: '100kb' }));

const wrap = (f) => (req, res) => Promise.resolve(f(req, res)).catch((e) => { console.error(e); res.status(500).json({ error: 'Server error. Please try again.' }); });
const auth = (...roles) => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); }
  catch { return res.status(401).json({ error: 'Please log in again.' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have access to this.' });
  next();
};
const staff = ['admin', 'teacher'];
const isFamily = (u) => u.role === 'student' || u.role === 'parent';
const myStudent = async (u) => (await q('select s.*, c.name as class_name from students s left join classes c on c.id=s.class_id where s.user_id=$1 or s.parent_user_id=$1', [u.id]))[0];
// Students and parents can only ever see their own child's records.
const scopedId = async (req) => (isFamily(req.user) ? (await myStudent(req.user) || {}).id : +req.query.student_id || null);
const need = (res, ...v) => (v.every((x) => x !== undefined && x !== null && String(x).trim() !== '') ? false : !res.status(400).json({ error: 'Please fill in all the fields.' }));

const fails = new Map();
app.get('/api/config', (_, res) => res.json({ demo: DEMO }));
app.post('/api/login', wrap(async (req, res) => {
  const f = fails.get(req.ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 15 * 60 * 1000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 8) return res.status(429).json({ error: 'Too many wrong attempts. Please wait 15 minutes and try again.' });
  const [u] = await q('select * from users where email=$1', [String(req.body.email || '').toLowerCase().trim()]);
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.password)) { f.n++; fails.set(req.ip, f); return res.status(400).json({ error: 'Wrong email or password.' }); }
  fails.delete(req.ip);
  const user = { id: u.id, name: u.name, role: u.role };
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user });
}));

app.post('/api/password', auth(), wrap(async (req, res) => {
  const [u] = await q('select * from users where id=$1', [req.user.id]);
  if (!u || !bcrypt.compareSync(String(req.body.old || ''), u.password)) return res.status(400).json({ error: 'Your current password is wrong.' });
  if (String(req.body.new || '').length < 6) return res.status(400).json({ error: 'New password needs at least 6 characters.' });
  await q('update users set password=$1 where id=$2', [bcrypt.hashSync(String(req.body.new), 8), u.id]);
  res.json({ ok: true });
}));

app.get('/api/me', auth('student', 'parent'), wrap(async (req, res) => res.json((await myStudent(req.user)) || {})));

app.get('/api/stats', auth(...staff), wrap(async (_, res) => {
  const n = async (sql) => +(await q(sql))[0].n;
  res.json({
    students: await n('select count(*) as n from students'), teachers: await n('select count(*) as n from teachers'),
    classes: await n('select count(*) as n from classes'), pending: await n('select count(*) as n from fees where paid=false'),
  });
}));

// Classes
app.get('/api/classes', auth(), wrap(async (_, res) => res.json(await q('select * from classes order by name'))));
app.post('/api/classes', auth('admin'), wrap(async (req, res) => {
  if (need(res, req.body.name)) return;
  res.json((await q('insert into classes(name) values($1) returning *', [req.body.name.trim()]))[0]);
}));
app.delete('/api/classes/:id', auth('admin'), wrap(async (req, res) => {
  if ((await q('select id from students where class_id=$1', [+req.params.id])).length) return res.status(400).json({ error: 'Move or remove the students in this class first.' });
  await q('delete from timetable where class_id=$1', [+req.params.id]);
  await q('delete from classes where id=$1', [+req.params.id]);
  res.json({ ok: true });
}));

// Students (each student gets a student login and a parent login)
app.get('/api/students', auth(...staff), wrap(async (req, res) => {
  const cid = +req.query.class_id || null;
  res.json(await q(`select s.*, c.name as class_name from students s left join classes c on c.id=s.class_id ${cid ? 'where s.class_id=$1' : ''} order by s.roll`, cid ? [cid] : []));
}));
const mail = (v) => String(v || '').toLowerCase().trim();
const okMail = (v) => /^\S+@\S+\.\S+$/.test(v);
const pwOf = (v) => String(v || '').trim() || 'pass123';
app.post('/api/students', auth('admin'), wrap(async (req, res) => {
  const { name, class_id } = req.body, roll = mail(req.body.roll);
  if (need(res, name, roll, class_id)) return;
  if (!/^[a-z0-9]+$/.test(roll)) return res.status(400).json({ error: 'Roll number can only have letters and numbers.' });
  const se = mail(req.body.student_email) || roll + '@uni.edu', pe = mail(req.body.parent_email) || 'parent.' + roll + '@uni.edu';
  const sp = pwOf(req.body.password), pp = pwOf(req.body.parent_password);
  if (!okMail(se) || !okMail(pe)) return res.status(400).json({ error: 'Please enter valid email addresses.' });
  if (se === pe) return res.status(400).json({ error: 'Student and parent need different emails.' });
  if (sp.length < 6 || pp.length < 6) return res.status(400).json({ error: 'Passwords need at least 6 characters.' });
  if ((await q('select id from students where roll=$1', [roll])).length) return res.status(400).json({ error: 'That roll number is already used.' });
  if ((await q('select id from users where email=$1 or email=$2', [se, pe])).length) return res.status(400).json({ error: 'One of those emails is already used.' });
  const su = await mkUser(name.trim(), se, 'student', sp), pu = await mkUser('Parent of ' + name.trim(), pe, 'parent', pp);
  await q('insert into students(name,roll,class_id,user_id,parent_user_id) values($1,$2,$3,$4,$5)', [name.trim(), roll, +class_id, su, pu]);
  res.json({ student: se, parent: pe });
}));
app.delete('/api/students/:id', auth('admin'), wrap(async (req, res) => {
  const id = +req.params.id, [s] = await q('select * from students where id=$1', [id]);
  if (!s) return res.status(404).json({ error: 'Student not found.' });
  for (const t of ['attendance', 'marks', 'fees']) await q(`delete from ${t} where student_id=$1`, [id]);
  await q('delete from students where id=$1', [id]);
  await q('delete from users where id=$1 or id=$2', [s.user_id, s.parent_user_id]);
  res.json({ ok: true });
}));

// Teachers
app.get('/api/teachers', auth('admin'), wrap(async (_, res) => res.json(await q('select t.*, u.email from teachers t join users u on u.id=t.user_id order by t.name'))));
app.post('/api/teachers', auth('admin'), wrap(async (req, res) => {
  const { name, subject } = req.body, email = mail(req.body.email), pw = pwOf(req.body.password);
  if (need(res, name, subject, email)) return;
  if (!okMail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (pw.length < 6) return res.status(400).json({ error: 'Password needs at least 6 characters.' });
  if ((await q('select id from users where email=$1', [email])).length) return res.status(400).json({ error: 'That email is already used.' });
  const uid = await mkUser(name.trim(), email, 'teacher', pw);
  await q('insert into teachers(name,subject,user_id) values($1,$2,$3)', [name.trim(), subject.trim(), uid]);
  res.json({ email });
}));
app.delete('/api/teachers/:id', auth('admin'), wrap(async (req, res) => {
  const [t] = await q('select * from teachers where id=$1', [+req.params.id]);
  if (t) { await q('delete from teachers where id=$1', [t.id]); await q('delete from users where id=$1', [t.user_id]); }
  res.json({ ok: true });
}));

// Attendance
app.get('/api/attendance', auth(...staff), wrap(async (req, res) => {
  const rows = await q('select id,name,roll from students where class_id=$1 order by roll', [+req.query.class_id]);
  const done = await q('select student_id,status from attendance where day=$1', [req.query.day]);
  res.json(rows.map((r) => ({ ...r, status: (done.find((d) => d.student_id === r.id) || {}).status || null })));
}));
app.post('/api/attendance', auth(...staff), wrap(async (req, res) => {
  const { day, records } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !Array.isArray(records)) return res.status(400).json({ error: 'Pick a date first.' });
  for (const r of records) {
    if (!['Present', 'Absent', 'Late'].includes(r.status)) continue;
    await q('delete from attendance where student_id=$1 and day=$2', [+r.student_id, day]);
    await q('insert into attendance(student_id,day,status) values($1,$2,$3)', [+r.student_id, day, r.status]);
  }
  res.json({ ok: true });
}));
app.get('/api/attendance/report', auth(), wrap(async (req, res) => {
  const month = String(req.query.month || '');
  const list = isFamily(req.user) ? [await myStudent(req.user)].filter(Boolean) : await q('select id,name,roll from students where class_id=$1 order by roll', [+req.query.class_id]);
  const out = [];
  for (const s of list) {
    const rows = (await q('select day,status from attendance where student_id=$1', [s.id])).filter((r) => r.day.startsWith(month));
    const c = (st) => rows.filter((r) => r.status === st).length;
    const present = c('Present') + c('Late');
    out.push({ id: s.id, name: s.name, roll: s.roll, present: c('Present'), late: c('Late'), absent: c('Absent'), total: rows.length, pct: rows.length ? Math.round((present / rows.length) * 100) : 0 });
  }
  res.json(out);
}));

// Marks
app.get('/api/marks', auth(), wrap(async (req, res) => {
  const id = await scopedId(req);
  res.json(id ? await q('select * from marks where student_id=$1 order by exam, subject', [id]) : []);
}));
app.post('/api/marks', auth(...staff), wrap(async (req, res) => {
  const { student_id, subject, exam, score, total } = req.body;
  if (need(res, student_id, subject, exam, score, total)) return;
  if (+score < 0 || +total <= 0 || +score > +total) return res.status(400).json({ error: 'Score must be between 0 and the total.' });
  await q('insert into marks(student_id,subject,exam,score,total) values($1,$2,$3,$4,$5)', [+student_id, subject.trim(), exam.trim(), +score, +total]);
  res.json({ ok: true });
}));
app.delete('/api/marks/:id', auth(...staff), wrap(async (req, res) => { await q('delete from marks where id=$1', [+req.params.id]); res.json({ ok: true }); }));

// Fees
app.get('/api/fees', auth(), wrap(async (req, res) => {
  const id = await scopedId(req);
  if (isFamily(req.user) && !id) return res.json([]);
  res.json(await q(`select f.*, s.name as student, s.roll from fees f join students s on s.id=f.student_id ${id ? 'where f.student_id=$1' : ''} order by f.id desc`, id ? [id] : []));
}));
app.post('/api/fees', auth('admin'), wrap(async (req, res) => {
  const { student_id, title, amount, due } = req.body;
  if (need(res, student_id, title, amount, due)) return;
  if (+amount <= 0) return res.status(400).json({ error: 'Amount must be more than 0.' });
  await q('insert into fees(student_id,title,amount,due) values($1,$2,$3,$4)', [+student_id, title.trim(), Math.round(+amount), due]);
  res.json({ ok: true });
}));
app.patch('/api/fees/:id/pay', auth('admin'), wrap(async (req, res) => {
  await q('update fees set paid=true, paid_on=$1 where id=$2', [new Date().toISOString().slice(0, 10), +req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/fees/:id', auth('admin'), wrap(async (req, res) => { await q('delete from fees where id=$1', [+req.params.id]); res.json({ ok: true }); }));

// Edit records
const edit = (res, ...v) => need(res, ...v);
app.put('/api/classes/:id', auth('admin'), wrap(async (req, res) => {
  if (edit(res, req.body.name)) return;
  await q('update classes set name=$1 where id=$2', [req.body.name.trim(), +req.params.id]);
  res.json({ ok: true });
}));
app.put('/api/students/:id', auth('admin'), wrap(async (req, res) => {
  const { name, class_id } = req.body;
  if (edit(res, name, class_id)) return;
  const [s] = await q('select * from students where id=$1', [+req.params.id]);
  if (!s) return res.status(404).json({ error: 'Student not found.' });
  await q('update students set name=$1, class_id=$2 where id=$3', [name.trim(), +class_id, s.id]);
  await q('update users set name=$1 where id=$2', [name.trim(), s.user_id]);
  await q('update users set name=$1 where id=$2', ['Parent of ' + name.trim(), s.parent_user_id]);
  res.json({ ok: true });
}));
app.put('/api/teachers/:id', auth('admin'), wrap(async (req, res) => {
  const { name, subject } = req.body;
  if (edit(res, name, subject)) return;
  const [t] = await q('select * from teachers where id=$1', [+req.params.id]);
  if (!t) return res.status(404).json({ error: 'Teacher not found.' });
  await q('update teachers set name=$1, subject=$2 where id=$3', [name.trim(), subject.trim(), t.id]);
  await q('update users set name=$1 where id=$2', [name.trim(), t.user_id]);
  res.json({ ok: true });
}));
app.put('/api/fees/:id', auth('admin'), wrap(async (req, res) => {
  const { title, amount, due } = req.body;
  if (edit(res, title, amount, due)) return;
  if (+amount <= 0) return res.status(400).json({ error: 'Amount must be more than 0.' });
  await q('update fees set title=$1, amount=$2, due=$3 where id=$4', [title.trim(), Math.round(+amount), due, +req.params.id]);
  res.json({ ok: true });
}));

// Timetable
app.get('/api/timetable', auth(), wrap(async (req, res) => {
  const cid = isFamily(req.user) ? (await myStudent(req.user) || {}).class_id : +req.query.class_id;
  res.json(cid ? await q('select * from timetable where class_id=$1 order by period', [cid]) : []);
}));
app.post('/api/timetable', auth('admin'), wrap(async (req, res) => {
  const { class_id, day, period, subject, teacher } = req.body;
  if (need(res, class_id, day, period, subject, teacher)) return;
  await q('delete from timetable where class_id=$1 and day=$2 and period=$3', [+class_id, day, +period]);
  await q('insert into timetable(class_id,day,period,subject,teacher) values($1,$2,$3,$4,$5)', [+class_id, day, +period, subject.trim(), teacher.trim()]);
  res.json({ ok: true });
}));
app.delete('/api/timetable/:id', auth('admin'), wrap(async (req, res) => { await q('delete from timetable where id=$1', [+req.params.id]); res.json({ ok: true }); }));

// Serve the built React app if it exists (after `npm run build` in /client)
const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'))); }

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  init().then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))).catch((e) => { console.error('Setup failed:', e.message); process.exit(1); });
}
module.exports = { app, init };
