import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Voucher({ fee, onClose }) {
  const no = 'V-' + String(fee.id).padStart(5, '0');
  return (
    <Modal onClose={onClose}>
      <div className="paper-head"><h2>Campus Hub University</h2><p>Fee Voucher · {no}</p></div>
      <div className="kv"><span><b>{fee.student}</b></span><span>Roll: {fee.roll}</span><span>Issued: {today()}</span></div>
      <table><tbody>
        <tr><td>Description</td><td><b>{fee.title}</b></td></tr>
        <tr><td>Due date</td><td>{fee.due}</td></tr>
        <tr><td>Amount</td><td className="big">{money(fee.amount)}</td></tr>
        <tr><td>Status</td><td>{fee.paid ? <span className="tag ok">Paid on {fee.paid_on}</span> : <span className="tag bad">Unpaid</span>}</td></tr>
      </tbody></table>
      <p style={{ color: 'var(--mute)', marginTop: 18 }}>Please pay at the accounts office and keep this voucher as your receipt.</p>
      <div className="noprint"><button className="btn ghost" onClick={onClose}>Close</button><button className="btn" onClick={() => window.print()}>Print or save PDF</button></div>
    </Modal>
  );
}
function Fees({ user }) {
  const admin = user.role === 'admin';
  const [list, load] = useLoad('/fees');
  const [studs] = useLoad('/students', !admin);
  const [f, setF] = useState({ student_id: 0, title: '', amount: '', due: today() });
  const [v, setV] = useState(null);
  const [edit, setEdit] = useState(null);
  const [qs, setQs] = useState('');
  const [msg, flash] = useFlash();
  useEffect(() => { if (admin && studs.length && !f.student_id) setF((p) => ({ ...p, student_id: studs[0].id })); }, [studs]); // eslint-disable-line
  const shown = list.filter((x) => (x.student + ' ' + x.roll + ' ' + x.title).toLowerCase().includes(qs.toLowerCase()));
  const due = list.filter((x) => !x.paid).reduce((a, x) => a + x.amount, 0);
  return (
    <>
      <Head title="Fees" sub={`Outstanding: ${money(due)}`} />{msg}
      {admin && <div className="card row">
        <label>Student<select value={f.student_id} onChange={(e) => setF({ ...f, student_id: +e.target.value })}>{studs.map((s) => <option key={s.id} value={s.id}>{s.roll} · {s.name}</option>)}</select></label>
        <label>Description<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Tuition - Semester 2" /></label>
        <label>Amount (₹)<input type="number" min="1" style={{ width: 130 }} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
        <label>Due date<input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
        <button className="btn" onClick={run(flash, async () => { await api('/fees', { method: 'POST', body: f }); setF({ ...f, title: '', amount: '' }); load(); }, 'Fee record added.')}>Add fee</button>
      </div>}
      <div className="card">
        {admin && list.length > 0 && <Search value={qs} onChange={setQs} />}
        {!list.length ? <Empty text="No fee records yet." /> : !shown.length ? <Empty text="No fee records match your search." /> : <table><thead><tr>{admin && <th>Student</th>}<th>Description</th><th>Amount</th><th>Due</th><th>Status</th><th /></tr></thead><tbody>
          {shown.map((x) => <tr key={x.id}>{admin && <td>{x.roll} · {x.student}</td>}<td>{x.title}</td><td>{money(x.amount)}</td><td>{x.due}</td>
            <td>{x.paid ? <span className="tag ok">Paid</span> : <span className="tag warn">Unpaid</span>}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <button className="btn ghost sm" onClick={() => setV(x)}>Voucher</button>{' '}
              {admin && <button className="btn ghost sm" onClick={() => setEdit(x)}>Edit</button>}{' '}
              {admin && !x.paid && <button className="btn sm" onClick={run(flash, async () => { await api(`/fees/${x.id}/pay`, { method: 'PATCH' }); load(); }, 'Marked as paid.')}>Mark paid</button>}{' '}
              {admin && <button className="btn red sm" onClick={run(flash, async () => { if (confirm('Delete this fee record?')) { await api('/fees/' + x.id, { method: 'DELETE' }); load(); } })}>Delete</button>}</td></tr>)}
        </tbody></table>}
      </div>
      {v && <Voucher fee={v} onClose={() => setV(null)} />}
      {edit && <EditModal title="Edit fee record" fields={[{ key: 'title', label: 'Description' }, { key: 'amount', label: 'Amount (₹)', type: 'number' }, { key: 'due', label: 'Due date', type: 'date' }]}
        initial={{ title: edit.title, amount: edit.amount, due: edit.due }} onClose={() => setEdit(null)}
        onSave={async (v2) => { await api('/fees/' + edit.id, { method: 'PUT', body: v2 }); load(); flash('Fee record updated.'); }} />}
    </>
  );
}

export default Fees;
