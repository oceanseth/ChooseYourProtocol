import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { CATEGORIES, categoryByKey } from '../lib/goals.js';
import {
  db, doc, updateDoc, collection, onSnapshot
} from '../firebase.js';

export default function Admin() {
  const { org, orgId, isAdmin, refresh } = useAuth();
  const [goals, setGoals] = useState((org && org.companyGoals) || []);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ category: 'business', title: '', metric: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { setGoals((org && org.companyGoals) || []); }, [org]);

  useEffect(() => {
    if (!orgId) return undefined;
    return onSnapshot(collection(db, 'organizations', orgId, 'members'), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, [orgId]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const persist = async (next) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'organizations', orgId), { companyGoals: next });
      setGoals(next);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await persist([...goals, { ...form, title: form.title.trim(), progress: 10, createdAt: Date.now() }]);
    setForm({ category: 'business', title: '', metric: '' });
  };

  const removeGoal = (i) => persist(goals.filter((_, idx) => idx !== i));

  const activeMembers = members.filter((m) => m.availability && m.availability.status !== 'offline').length;

  return (
    <div className="admin">
      <h1>Admin · {org && org.name}</h1>
      <p className="muted">Set company goals. Your agent measures progress and times level-up nudges to maximize growth toward them.</p>

      <div className="admin-stats">
        <div className="stat-box"><span className="big">{members.length}</span><span>members</span></div>
        <div className="stat-box"><span className="big">{activeMembers}</span><span>online now</span></div>
        <div className="stat-box"><span className="big">{goals.length}</span><span>company goals</span></div>
      </div>

      <section className="card">
        <h2>Company goals</h2>
        <ul className="goal-list">
          {goals.map((g, i) => (
            <li key={i}>
              <div className="goal-list-top">
                <span>{categoryByKey(g.category)?.icon || '📈'} <strong>{g.title}</strong> {g.metric && <span className="muted">· {g.metric}</span>}</span>
                <button className="link danger" onClick={() => removeGoal(i)} disabled={busy}>Remove</button>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: `${Math.min(100, g.progress || 10)}%` }} /></div>
            </li>
          ))}
          {goals.length === 0 && <p className="muted">No company goals yet.</p>}
        </ul>

        <form className="goal-form" onSubmit={addGoal}>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input placeholder="Goal (e.g. Ship v2 with 0 P0 bugs)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Metric (optional)" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} />
          <button className="btn btn-primary" disabled={busy}>Add goal</button>
        </form>
      </section>

      <section className="card">
        <h2>Members</h2>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id}>
              <span className="member-name">{m.displayName}</span>
              <span className="muted small">{m.email}</span>
              <span className={`role-badge ${m.role}`}>{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
