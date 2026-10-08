import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Classes() {
  const [list, load] = useLoad('/classes');
  const [name, setName] = useState('');
  const [msg, flash] = useFlash();
  const [edit, setEdit] = useState(null);
  return (
    <>
      <Head title="Classes" sub="Create the classes students belong to." />{msg}
      <div className="card row">
        <label>Class name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CSE-C" /></label>
        <button className="btn" onClick={run(flash, async () => { await api('/classes', { method: 'POST', body: { name } }); setName(''); load(); }, 'Class added.')}>Add class</button>
      </div>
      <div className="card">
        {!list.length ? <Empty text="No classes yet. Add your first class above." /> : <table><thead><tr><th>Class</th><th /></tr></thead><tbody>
          {list.map((c) => <tr key={c.id}><td>{c.name}</td><td style={{ textAlign: 'right' }}>
            <button className="btn ghost sm" onClick={() => setEdit(c)}>Rename</button>{' '}
            <button className="btn red sm" onClick={run(flash, async () => { if (confirm(`Delete class ${c.name}?`)) { await api('/classes/' + c.id, { method: 'DELETE' }); load(); } })}>Delete</button></td></tr>)}
        </tbody></table>}
      </div>
      {edit && <EditModal title="Rename class" fields={[{ key: 'name', label: 'Class name' }]} initial={{ name: edit.name }} onClose={() => setEdit(null)}
        onSave={async (v) => { await api('/classes/' + edit.id, { method: 'PUT', body: v }); load(); flash('Class renamed.'); }} />}
    </>
  );
}

export default Classes;
