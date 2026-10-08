import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function ReportCard({ stu, marks, onClose }) {
  const exams = [...new Set(marks.map((m) => m.exam))];
  const all = marks.reduce((a, m) => ({ s: a.s + m.score, t: a.t + m.total }), { s: 0, t: 0 });
  const pct = all.t ? Math.round((all.s / all.t) * 100) : 0;
  return (
    <Modal onClose={onClose}>
      <div className="paper-head"><h2>Campus Hub University</h2><p>Student Report Card</p></div>
      <div className="kv"><span><b>{stu.name}</b></span><span>Roll: {stu.roll}</span><span>Class: {stu.class_name}</span><span>Date: {today()}</span></div>
      {exams.map((ex) => <div key={ex} style={{ marginBottom: 14 }}><h3 style={{ marginBottom: 8 }}>{ex}</h3>
        <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead><tbody>
          {marks.filter((m) => m.exam === ex).map((m) => { const p = Math.round((m.score / m.total) * 100); return <tr key={m.id}><td>{m.subject}</td><td>{m.score} / {m.total}</td><td>{p}%</td><td><span className={'tag ' + (p >= 50 ? 'ok' : 'bad')}>{grade(p)}</span></td></tr>; })}
        </tbody></table></div>)}
      <div className="kv"><span className="big">Overall: {all.s} / {all.t} ({pct}%)</span><span className="big">Grade {grade(pct)}</span></div>
      <div className="noprint"><button className="btn ghost" onClick={onClose}>Close</button><button className="btn" onClick={() => window.print()}>Print or save PDF</button></div>
    </Modal>
  );
}
function Marks({ user }) {
  const staff = user.role === 'admin' || user.role === 'teacher';
  const [cid, setCid] = useState(0);
  const [sid, setSid] = useState(0);
  const [studs] = useLoad(`/students?class_id=${cid}`, !staff || !cid);
  const [me] = useLoad('/me', staff);
  const [marks, load] = useLoad(`/marks?student_id=${sid}`, staff && !sid);
  const [f, setF] = useState({ subject: '', exam: 'Midterm', score: '', total: 100 });
  const [card, setCard] = useState(false);
  const [msg, flash] = useFlash();
  useEffect(() => { if (staff) setSid(studs.length ? (studs.find((s) => s.id === sid) ? sid : studs[0].id) : 0); }, [studs]); // eslint-disable-line
  const stu = staff ? studs.find((s) => s.id === sid) : (me.id ? me : null);
  return (
    <>
      <Head title={staff ? 'Results' : 'Results and report card'} sub={staff ? 'Enter marks for each student and exam.' : stu ? `${stu.name} · ${stu.class_name}` : ''}>
        {stu && marks.length > 0 && <button className="btn" onClick={() => setCard(true)}>View report card</button>}
      </Head>{msg}
      {staff && <div className="card row"><ClassPick value={cid} onChange={setCid} />
        <label>Student<select value={sid || ''} onChange={(e) => setSid(+e.target.value)}>{studs.map((s) => <option key={s.id} value={s.id}>{s.roll} · {s.name}</option>)}</select></label></div>}
      {staff && sid > 0 && <div className="card row">
        <label>Subject<input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>
        <label>Exam<input value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} /></label>
        <label>Score<input type="number" style={{ width: 100 }} min="0" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} /></label>
        <label>Out of<input type="number" style={{ width: 100 }} min="1" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></label>
        <button className="btn" onClick={run(flash, async () => { await api('/marks', { method: 'POST', body: { ...f, student_id: sid } }); setF({ ...f, subject: '', score: '' }); load(); }, 'Marks saved.')}>Save marks</button>
      </div>}
      <div className="card">
        {!marks.length ? <Empty text={staff ? 'No marks entered for this student yet.' : 'No results have been published yet.'} /> : <table><thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Grade</th>{staff && <th />}</tr></thead><tbody>
          {marks.map((m) => { const p = Math.round((m.score / m.total) * 100); return <tr key={m.id}><td>{m.exam}</td><td>{m.subject}</td><td>{m.score} / {m.total}</td><td><span className={'tag ' + (p >= 50 ? 'ok' : 'bad')}>{grade(p)}</span></td>
            {staff && <td style={{ textAlign: 'right' }}><button className="btn red sm" onClick={run(flash, async () => { await api('/marks/' + m.id, { method: 'DELETE' }); load(); })}>Delete</button></td>}</tr>; })}
        </tbody></table>}
      </div>
      {card && stu && <ReportCard stu={stu} marks={marks} onClose={() => setCard(false)} />}
    </>
  );
}

export default Marks;
