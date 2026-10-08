import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Teachers() {
  const [list, load] = useLoad('/teachers');
  const [f, setF] = useState({ name: '', subject: '', email: '', password: '' });
  const [msg, flash] = useFlash();
  const [edit, setEdit] = useState(null);
  const [qs, setQs] = useState('');
  const shown = list.filter((t) => (t.name + ' ' + t.subject + ' ' + t.email).toLowerCase().includes(qs.toLowerCase()));
  return (
    <>
      <Head title="Teachers" sub="Teachers can mark attendance and enter marks." />{msg}
      <div className="card row">
        <label>Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Subject<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
        <label>Login email<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="teacher@gmail.com" /></label>
        <label>Password<input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="min 6 characters" /></label>
        <button className="btn" onClick={run(flash, async () => { const r = await api('/teachers', { method: 'POST', body: f }); setF({ name: '', subject: '', email: '', password: '' }); load(); return r; }, (r) => `Teacher added. They can log in with ${r.email}.`)}>Add teacher</button>
      </div>
      <div className="card">
        {list.length > 0 && <Search value={qs} onChange={setQs} />}
        {!list.length ? <Empty text="No teachers yet." /> : !shown.length ? <Empty text="No teachers match your search." /> : <table><thead><tr><th>Name</th><th>Subject</th><th>Email</th><th /></tr></thead><tbody>
          {shown.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.subject}</td><td>{t.email}</td><td style={{ textAlign: 'right' }}>
            <button className="btn ghost sm" onClick={() => setEdit(t)}>Edit</button>{' '}
            <button className="btn red sm" onClick={run(flash, async () => { if (confirm(`Remove ${t.name}?`)) { await api('/teachers/' + t.id, { method: 'DELETE' }); load(); } })}>Remove</button></td></tr>)}
        </tbody></table>}
      </div>
      {edit && <EditModal title="Edit teacher" fields={[{ key: 'name', label: 'Full name' }, { key: 'subject', label: 'Subject' }]} initial={{ name: edit.name, subject: edit.subject }} onClose={() => setEdit(null)}
        onSave={async (v) => { await api('/teachers/' + edit.id, { method: 'PUT', body: v }); load(); flash('Teacher updated.'); }} />}
    </>
  );
}

export default Teachers;
