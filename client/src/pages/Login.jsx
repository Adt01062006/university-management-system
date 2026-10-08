import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [demo, setDemo] = useState(false);
  useEffect(() => { api('/config').then((c) => setDemo(c.demo)).catch(() => {}); }, []);
  const go = async (e, p) => {
    try { const d = await api('/login', { method: 'POST', body: { email: e, password: p } }); localStorage.setItem('token', d.token); onLogin(d.user); }
    catch (x) { setErr(x.message); }
  };
  const demos = [['Admin', 'admin@uni.edu', 'admin123'], ['Teacher', 't.sharma@uni.edu', 'pass123'], ['Student', 'cs101@uni.edu', 'pass123'], ['Parent', 'parent.cs101@uni.edu', 'pass123']];
  return (
    <div className="login">
      <div className="hero">
        <div className="crest">C</div>
        <h1>Every class, mark and fee in one place.</h1>
        <p>Campus Hub replaces paper registers and scattered spreadsheets with one portal for the whole school.</p>
        <div className="roles"><span>Admin</span><span>Teachers</span><span>Students</span><span>Parents</span></div>
      </div>
      <div className="form">
        <div className="box">
          <h2>Welcome back</h2>
          {err && <div className="msg err" role="alert">{err}</div>}
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@uni.edu" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(email, password)} /></label>
          <button className="btn" onClick={() => go(email, password)}>Log in</button>
          {demo && <div className="demo"><small>Try a demo account:</small>
            {demos.map(([n, e, p]) => <button key={n} onClick={() => go(e, p)}><span>{n}</span><small>{e}</small></button>)}
          </div>}
        </div>
      </div>
    </div>
  );
}

export default Login;
