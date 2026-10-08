const test = require('node:test');
const assert = require('node:assert');
process.env.JWT_SECRET = 'test-secret';
const { app, init } = require('../server.js');

let server, base;
test.before(async () => { await init(); server = app.listen(0); base = `http://localhost:${server.address().port}/api`; });
test.after(() => server.close());

const call = async (method, path, token, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};
const login = async (email, password) => (await call('POST', '/login', null, { email, password })).data.token;

test('login works and rejects wrong passwords', async () => {
  assert.ok(await login('admin@uni.edu', 'admin123'));
  const bad = await call('POST', '/login', null, { email: 'admin@uni.edu', password: 'nope' });
  assert.strictEqual(bad.status, 400);
});
test('routes need a login', async () => { assert.strictEqual((await call('GET', '/students')).status, 401); });
test('parent only sees their own child and cannot use staff routes', async () => {
  const p = await login('parent.cs101@uni.edu', 'pass123');
  const me = (await call('GET', '/me', p)).data;
  const marks = (await call('GET', '/marks?student_id=2', p)).data;
  assert.ok(marks.length > 0 && marks.every((m) => m.student_id === me.id));
  assert.strictEqual((await call('GET', '/students', p)).status, 403);
  assert.strictEqual((await call('POST', '/marks', p, { student_id: me.id, subject: 'x', exam: 'y', score: 1, total: 2 })).status, 403);
});
test('admin adds a student with real emails and they can log in', async () => {
  const a = await login('admin@uni.edu', 'admin123');
  const r = await call('POST', '/students', a, { name: 'Test Kid', roll: 'tk1', class_id: 1, student_email: 'kid@example.com', password: 'secret12', parent_email: 'mum@example.com', parent_password: 'secret34' });
  assert.strictEqual(r.status, 200);
  assert.ok(await login('kid@example.com', 'secret12'));
  assert.ok(await login('mum@example.com', 'secret34'));
  const dup = await call('POST', '/students', a, { name: 'Other', roll: 'tk2', class_id: 1, student_email: 'kid@example.com' });
  assert.strictEqual(dup.status, 400);
  const short = await call('POST', '/students', a, { name: 'Other', roll: 'tk3', class_id: 1, password: '123' });
  assert.strictEqual(short.status, 400);
});
test('admin can edit student, teacher, class and fee', async () => {
  const a = await login('admin@uni.edu', 'admin123');
  assert.strictEqual((await call('PUT', '/students/1', a, { name: 'Aarav M. Mehta', class_id: 1 })).status, 200);
  assert.strictEqual((await call('GET', '/students', a)).data.find((s) => s.id === 1).name, 'Aarav M. Mehta');
  assert.strictEqual((await call('PUT', '/teachers/1', a, { name: 'Prof. Sharma', subject: 'Physics' })).status, 200);
  assert.strictEqual((await call('PUT', '/classes/1', a, { name: 'CSE-A1' })).status, 200);
  assert.strictEqual((await call('PUT', '/fees/1', a, { title: 'Tuition', amount: 50000, due: '2026-12-01' })).status, 200);
  assert.strictEqual((await call('PUT', '/fees/1', a, { title: 'Tuition', amount: 0, due: '2026-12-01' })).status, 400);
});
test('teacher marks attendance and the monthly report counts it', async () => {
  const t = await login('t.sharma@uni.edu', 'pass123');
  const day = '2026-01-15';
  assert.strictEqual((await call('POST', '/attendance', t, { day, records: [{ student_id: 1, status: 'Absent' }] })).status, 200);
  assert.strictEqual((await call('POST', '/attendance', t, { day, records: [{ student_id: 1, status: 'Present' }] })).status, 200);
  const rep = (await call('GET', '/attendance/report?month=2026-01&class_id=1', t)).data.find((r) => r.id === 1);
  assert.deepStrictEqual([rep.present, rep.absent, rep.total], [1, 0, 1]);
});
test('marks are validated', async () => {
  const t = await login('t.sharma@uni.edu', 'pass123');
  assert.strictEqual((await call('POST', '/marks', t, { student_id: 1, subject: 'Art', exam: 'Final', score: 120, total: 100 })).status, 400);
  assert.strictEqual((await call('POST', '/marks', t, { student_id: 1, subject: 'Art', exam: 'Final', score: 90, total: 100 })).status, 200);
});
test('only admin can manage fees; marking paid works', async () => {
  const a = await login('admin@uni.edu', 'admin123'), t = await login('t.sharma@uni.edu', 'pass123');
  assert.strictEqual((await call('POST', '/fees', t, { student_id: 1, title: 'x', amount: 5, due: '2026-12-01' })).status, 403);
  await call('POST', '/fees', a, { student_id: 1, title: 'Lab fee', amount: 1500, due: '2026-12-01' });
  const fee = (await call('GET', '/fees', a)).data.find((f) => f.title === 'Lab fee');
  assert.strictEqual(fee.paid, false);
  await call('PATCH', `/fees/${fee.id}/pay`, a);
  assert.strictEqual((await call('GET', '/fees', a)).data.find((f) => f.id === fee.id).paid, true);
});
test('users can change their own password', async () => {
  const s = await login('cs103@uni.edu', 'pass123');
  assert.strictEqual((await call('POST', '/password', s, { old: 'wrong', new: 'newpass1' })).status, 400);
  assert.strictEqual((await call('POST', '/password', s, { old: 'pass123', new: 'newpass1' })).status, 200);
  assert.ok(await login('cs103@uni.edu', 'newpass1'));
});
test('too many wrong logins get blocked', async () => {
  for (let i = 0; i < 8; i++) await call('POST', '/login', null, { email: 'nobody@x.com', password: 'bad' });
  assert.strictEqual((await call('POST', '/login', null, { email: 'nobody@x.com', password: 'bad' })).status, 429);
});
