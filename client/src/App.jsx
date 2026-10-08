import { useState } from 'react';
import './styles.css';
import { api } from './lib.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Classes from './pages/Classes.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Attendance from './pages/Attendance.jsx';
import Marks from './pages/Marks.jsx';
import Fees from './pages/Fees.jsx';
import Timetable from './pages/Timetable.jsx';

const NAV = {
  admin: [['Dashboard', '🏠'], ['Students', '🎓'], ['Teachers', '👩‍🏫'], ['Classes', '🏫'], ['Attendance', '🗓️'], ['Results', '📝'], ['Fees', '💳'], ['Timetable', '⏰']],
  teacher: [['Dashboard', '🏠'], ['Students', '🎓'], ['Attendance', '🗓️'], ['Results', '📝'], ['Timetable', '⏰']],
  student: [['Dashboard', '🏠'], ['Results', '📝'], ['Attendance', '🗓️'], ['Fees', '💳'], ['Timetable', '⏰']],
};
NAV.parent = NAV.student;

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [page, setPage] = useState('Dashboard');
  const login = (u) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u); setPage('Dashboard'); };
  const logout = () => { localStorage.clear(); setUser(null); };
  if (!user || !localStorage.getItem('token')) return <Login onLogin={login} />;
  const pages = { Dashboard, Students, Teachers, Classes, Attendance, Results: Marks, Fees, Timetable };
  const Page = pages[page];
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><div className="crest">C</div><div><b>Campus Hub</b><small>University portal</small></div></div>
        {NAV[user.role].map(([n, i]) => <button key={n} className={'nav' + (page === n ? ' on' : '')} onClick={() => setPage(n)}><span aria-hidden>{i}</span>{n}</button>)}
        <div className="who"><b>{user.name}</b><small>{user.role}</small><button className="btn ghost sm" onClick={async () => { const o = prompt('Your current password:'); if (!o) return; const n = prompt('New password (at least 6 characters):'); if (!n) return; try { await api('/password', { method: 'POST', body: { old: o, new: n } }); alert('Password changed.'); } catch (e) { alert(e.message); } }}>Change password</button><button className="btn ghost sm" onClick={logout}>Log out</button></div>
      </aside>
      <main className="main"><Page user={user} key={page} /></main>
    </div>
  );
}
