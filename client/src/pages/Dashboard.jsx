import { useState, useEffect } from 'react';
import { api, DAYS, today, money, grade, useLoad, useFlash, run, Head, Modal, Empty, ClassPick, EditModal, Search } from '../lib.jsx';

function Dashboard({ user }) {
  const fam = user.role === 'student' || user.role === 'parent';
  const [stats] = useLoad('/stats', fam);
  const [me] = useLoad('/me', !fam);
  return (
    <>
      <Head title={`Hello, ${user.name.split(' ')[0]}`} sub={fam ? (me.name ? `${me.name} · ${me.class_name} · Roll ${me.roll}` : '') : 'Here is how the campus looks today.'} />
      {fam ? <div className="card"><h3>Your portal</h3><p>Use the menu to see results, attendance, fees and the class timetable{user.role === 'parent' ? ' for your child' : ''}. Report cards and fee vouchers can be printed or saved as PDF.</p></div> : (
        <div className="stats">
          <div className="stat"><b>{stats.students ?? '–'}</b><span>Students</span></div>
          <div className="stat"><b>{stats.teachers ?? '–'}</b><span>Teachers</span></div>
          <div className="stat"><b>{stats.classes ?? '–'}</b><span>Classes</span></div>
          <div className="stat"><b>{stats.pending ?? '–'}</b><span>Unpaid fee records</span></div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
