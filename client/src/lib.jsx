import { useState, useEffect, useCallback } from 'react';

export const api = async (path, opt = {}) => {
  const r = await fetch('/api' + path, {
    method: opt.method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('token') || '') },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== '/login') { localStorage.clear(); location.reload(); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Please try again.');
  return d;
};
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const grade = (p) => (p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F');

export function useLoad(path, skip) {
  const [data, setData] = useState([]);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    if (skip) { setData([]); return; }
    api(path).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message));
  }, [path, skip]);
  useEffect(() => { load(); }, [load]);
  return [data, load, err];
}
export function useFlash() {
  const [m, setM] = useState(null);
  const flash = (text, bad) => { setM({ text, bad }); setTimeout(() => setM(null), bad ? 5000 : 3500); };
  return [m && <div className={'msg' + (m.bad ? ' err' : '')} role="status">{m.text}</div>, flash];
}
export const run = (flash, fn, ok) => async () => { try { const r = await fn(); if (ok) flash(typeof ok === 'function' ? ok(r) : ok); } catch (e) { flash(e.message, true); } };
export const Head = ({ title, sub, children }) => <div className="head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children}</div>;
export const Modal = ({ children, onClose }) => <div className="overlay" onClick={onClose}><div className="modal print-area" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
export const Empty = ({ text }) => <div className="empty">{text}</div>;
export function ClassPick({ value, onChange }) {
  const [cl] = useLoad('/classes');
  useEffect(() => { if (!value && cl.length) onChange(cl[0].id); }, [cl, value, onChange]);
  return <label>Class<select value={value || ''} onChange={(e) => onChange(+e.target.value)}>{cl.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
}

export const Search = ({ value, onChange }) => <input type="search" placeholder="Search by name or roll..." value={value} onChange={(e) => onChange(e.target.value)} style={{ marginBottom: 12, width: '100%', maxWidth: 320 }} />;
export function EditModal({ title, fields, initial, onSave, onClose }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const [cl] = useLoad('/classes', !fields.some((f) => f.type === 'class'));
  const save = async () => { try { await onSave(v); onClose(); } catch (e) { setErr(e.message); } };
  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      {err && <div className="msg err" role="alert">{err}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {fields.map((f) => <label key={f.key}>{f.label}
          {f.type === 'class'
            ? <select value={v[f.key] || ''} onChange={(e) => setV({ ...v, [f.key]: +e.target.value })}>{cl.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            : <input type={f.type || 'text'} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
        </label>)}
      </div>
      <div className="noprint"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" onClick={save}>Save changes</button></div>
    </Modal>
  );
}
