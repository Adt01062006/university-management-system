import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Timetable({ user }) {
  const staff = user.role === 'admin' || user.role === 'teacher';
  const [cid, setCid] = useState(0);
  const [list, load] = useLoad(`/timetable?class_id=${cid}`, staff && !cid);
  const [f, setF] = useState({ day: 'Mon', period: 1, subject: '', teacher: '' });
  const [msg, flash] = useFlash();
  const periods = [1, 2, 3, 4, 5, 6];
  return (
    <>
      <Head title="Timetable" sub="Weekly class schedule." />{msg}
      {staff && <div className="card row"><ClassPick value={cid} onChange={setCid} /></div>}
      {user.role === 'admin' && cid > 0 && <div className="card row">
        <label>Day<select value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Period<select value={f.period} onChange={(e) => setF({ ...f, period: +e.target.value })}>{periods.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>Subject<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
        <label>Teacher<input value={f.teacher} onChange={(e) => setF({ ...f, teacher: e.target.value })} /></label>
        <button className="btn" onClick={run(flash, async () => { await api('/timetable', { method: 'POST', body: { ...f, class_id: cid } }); setF({ ...f, subject: '' }); load(); }, 'Timetable updated.')}>Save slot</button>
      </div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="tt">
          <div className="h">Period</div>{DAYS.map((d) => <div className="h" key={d}>{d}</div>)}
          {periods.map((p) => [<div className="p" key={'p' + p}>{p}</div>, ...DAYS.map((d) => { const s = list.find((x) => x.day === d && x.period === p);
            return <div key={d + p}>{s && <><b>{s.subject}{user.role === 'admin' && <button className="x" aria-label="Remove slot" onClick={run(flash, async () => { await api('/timetable/' + s.id, { method: 'DELETE' }); load(); })}>×</button>}</b>{s.teacher}</>}</div>; })])}
        </div>
      </div>
    </>
  );
}

export default Timetable;
