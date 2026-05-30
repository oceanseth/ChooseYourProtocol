import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import {
  db, collection, query, where, onSnapshot, doc, updateDoc
} from '../firebase.js';

// Listens for pending level-up alerts targeted at the current user and shows
// a dismissible "modern smoke break" banner with a one-click Join.
function AlertBanner() {
  const { orgId, user } = useAuth();
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!orgId || !user) return undefined;
    const q = query(
      collection(db, 'organizations', orgId, 'alerts'),
      where('uid', '==', user.uid),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAlert(docs[0] || null);
    }, () => {});
  }, [orgId, user]);

  if (!alert) return null;

  const dismiss = async () => {
    try { await updateDoc(doc(db, 'organizations', orgId, 'alerts', alert.id), { status: 'dismissed' }); } catch {}
    setAlert(null);
  };
  const join = async () => {
    try { await updateDoc(doc(db, 'organizations', orgId, 'alerts', alert.id), { status: 'accepted' }); } catch {}
    navigate(`/activity?category=${alert.category || 'social'}`);
  };

  return (
    <div className="alert-banner">
      <span className="alert-bolt">⚡</span>
      <div className="alert-text">
        <strong>Level-up opportunity</strong>
        <span>{alert.topic} · {alert.reason}</span>
      </div>
      <button className="btn btn-primary" onClick={join}>Join</button>
      <button className="btn btn-ghost" onClick={dismiss}>Later</button>
    </div>
  );
}

export default function Layout() {
  const { org, member, isAdmin, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">⊘ <span>ChooseYourProtocol</span></div>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/activity">Level Up</NavLink>
          <NavLink to="/collection">Collection</NavLink>
          <NavLink to="/knowledge">Knowledge</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          <NavLink to="/about">About</NavLink>
        </nav>
        <div className="user-chip">
          <span className="org-name">{org && org.name}</span>
          <span className="member-name">{member && member.displayName}</span>
          <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <AlertBanner />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
