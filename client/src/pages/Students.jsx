import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Students({ user }) {
  const admin = user.role === 'admin';
  const [list, load] = useLoad('/students');
  const [f, setF] = useState({ name: '', roll: '', class_id: 0, student_email: '', parent_email: '', password: '', parent_password: '' });
  const [msg, flash] = useFlash();
  const [edit, setEdit] = useState(null);
  const [qs, setQs] = useState('');
  const shown = list.filter((s) => (s.name + ' ' + s.roll).toLowerCase().includes(qs.toLowerCase()));
  return (
    <>
      <Head title="Students" sub={admin ? 'Adding a student also creates a student login and a parent login. Leave email or password empty to use automatic ones.' : 'All students on campus.'} />{msg}
      {admin && <div className="card row">
        <label>Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Roll number<input value={f.roll} onChange={(e) => setF({ ...f, roll: e.target.value })} placeholder="e.g. cs120" /></label>
        <ClassPick value={f.class_id} onChange={(v) => setF((p) => ({ ...p, class_id: v }))} />
        <label>Student email<input type="email" value={f.student_email} onChange={(e) => setF({ ...f, student_email: e.target.value })} placeholder="student@gmail.com" /></label>
        <label>Student password<input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="min 6 characters" /></label>
        <label>Parent email<input type="email" value={f.parent_email} onChange={(e) => setF({ ...f, parent_email: e.target.value })} placeholder="parent@gmail.com" /></label>
        <label>Parent password<input value={f.parent_password} onChange={(e) => setF({ ...f, parent_password: e.target.value })} placeholder="min 6 characters" /></label>
        <button className="btn" onClick={run(flash, async () => {
          const r = await api('/students', { method: 'POST', body: f }); setF({ ...f, name: '', roll: '', student_email: '', parent_email: '', password: '', parent_password: '' }); load(); return r;
        }, (r) => `Student added. They can log in with ${r.student}, and the parent with ${r.parent}.`)}>Add student</button>
      </div>}
      <div className="card">
        {list.length > 0 && <Search value={qs} onChange={setQs} />}
        {!list.length ? <Empty text="No students yet." /> : !shown.length ? <Empty text="No students match your search." /> : <table><thead><tr><th>Roll</th><th>Name</th><th>Class</th>{admin && <th />}</tr></thead><tbody>
          {shown.map((s) => <tr key={s.id}><td>{s.roll}</td><td>{s.name}</td><td><span className="tag">{s.class_name}</span></td>
            {admin && <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEdit(s)}>Edit</button>{' '}<button className="btn red sm" onClick={run(flash, async () => { if (confirm(`Remove ${s.name} and all their records?`)) { await api('/students/' + s.id, { method: 'DELETE' }); load(); } })}>Remove</button></td>}</tr>)}
        </tbody></table>}
      </div>
      {edit && <EditModal title="Edit student" fields={[{ key: 'name', label: 'Full name' }, { key: 'class_id', label: 'Class', type: 'class' }]} initial={{ name: edit.name, class_id: edit.class_id }} onClose={() => setEdit(null)}
        onSave={async (v) => { await api('/students/' + edit.id, { method: 'PUT', body: v }); load(); flash('Student updated.'); }} />}
    </>
  );
}

export default Students;
