import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Report({ staff, cid }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [rows, , err] = useLoad(`/attendance/report?month=${month}&class_id=${cid || 0}`, staff && !cid);
  return (
    <div className="card print-area">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Monthly attendance report</h3>
        <div className="row noprint"><label>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <button className="btn ghost" onClick={() => window.print()}>Print or save PDF</button></div>
      </div>
      {err && <div className="msg err">{err}</div>}
      {!rows.length || !rows.some((r) => r.total) ? <Empty text="No attendance recorded for this month yet." /> : <table><thead><tr><th>Roll</th><th>Name</th><th>Present</th><th>Late</th><th>Absent</th><th>Attendance</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{r.roll}</td><td>{r.name}</td><td>{r.present}</td><td>{r.late}</td><td>{r.absent}</td>
          <td><div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}><div className="bar" style={{ flex: 1 }}><i className={r.pct < 75 ? 'low' : ''} style={{ width: r.pct + '%' }} /></div><b>{r.pct}%</b></div></td></tr>)}
      </tbody></table>}
    </div>
  );
}
function Attendance({ user }) {
  const staff = user.role === 'admin' || user.role === 'teacher';
  const [tab, setTab] = useState(staff ? 'mark' : 'report');
  const [cid, setCid] = useState(0);
  const [day, setDay] = useState(today());
  const [rows] = useLoad(`/attendance?class_id=${cid}&day=${day}`, !staff || !cid || tab !== 'mark');
  const [st, setSt] = useState({});
  const [msg, flash] = useFlash();
  useEffect(() => { setSt(Object.fromEntries(rows.map((r) => [r.id, r.status || 'Present']))); }, [rows]);
  const save = run(flash, () => api('/attendance', { method: 'POST', body: { day, records: Object.entries(st).map(([id, status]) => ({ student_id: +id, status })) } }), 'Attendance saved.');
  return (
    <>
      <Head title="Attendance" sub={staff ? 'Mark each day, then check the monthly report.' : 'Monthly attendance summary.'}>
        {staff && <div className="seg"><button className={tab === 'mark' ? 'on' : ''} onClick={() => setTab('mark')}>Mark attendance</button><button className={tab === 'report' ? 'on' : ''} onClick={() => setTab('report')}>Monthly report</button></div>}
      </Head>{msg}
      {staff && <div className="card row"><ClassPick value={cid} onChange={setCid} />{tab === 'mark' && <label>Date<input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>}</div>}
      {tab === 'mark' && staff ? (
        <div className="card">
          {!rows.length ? <Empty text="No students in this class yet." /> : <>
            <table><thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead><tbody>
              {rows.map((r) => <tr key={r.id}><td>{r.roll}</td><td>{r.name}</td><td><div className="seg">
                {[['Present', 'P'], ['Late', 'L'], ['Absent', 'A']].map(([s, c]) => <button key={s} className={st[r.id] === s ? 'on ' + c : ''} onClick={() => setSt({ ...st, [r.id]: s })}>{s}</button>)}
              </div></td></tr>)}
            </tbody></table>
            <div className="noprint"><button className="btn ghost" onClick={() => setSt(Object.fromEntries(rows.map((r) => [r.id, 'Present'])))}>Mark all present</button><button className="btn" onClick={save}>Save attendance</button></div>
          </>}
        </div>
      ) : <Report staff={staff} cid={cid} />}
    </>
  );
}

export default Attendance;
