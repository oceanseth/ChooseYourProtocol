import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { categoryByKey } from '../lib/goals.js';
import Creature from '../components/Creature.jsx';
import {
  db, collection, query, orderBy, limit, where, onSnapshot, getDocs
} from '../firebase.js';

function statusDot(status) {
  const map = { active: '#34d399', idle: '#fbbf24', offline: '#6b7280' };
  return <span className="dot" style={{ background: map[status] || map.offline }} />;
}

export default function Dashboard() {
  const { org, member, user, orgId } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [creatures, setCreatures] = useState([]);

  useEffect(() => {
    if (!orgId) return undefined;
    return onSnapshot(collection(db, 'organizations', orgId, 'members'), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !user) return;
    getDocs(query(
      collection(db, 'organizations', orgId, 'members', user.uid, 'collection'),
      orderBy('createdAt', 'desc'),
      limit(4)
    )).then((snap) => setCreatures(snap.docs.map((d) => ({ id: d.id, ...d.data() })))).catch(() => {});
  }, [orgId, user]);

  const goals = (member && member.personalGoals) || [];
  const companyGoals = (org && org.companyGoals) || [];
  const freeNow = members.filter((m) => m.availability && m.availability.status !== 'offline');

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div>
          <h1>Hey {member && member.displayName.split(' ')[0]} 👋</h1>
          <p className="muted">When teammates are free, your agent will nudge you. Or jump in now.</p>
        </div>
        <button className="btn btn-primary btn-lg pulse" onClick={() => navigate('/activity')}>
          ⚡ Start a level-up
        </button>
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2>Your protocols</h2>
            <Link className="link" to="/onboarding">+ Add</Link>
          </div>
          {goals.length === 0 && <p className="muted">No goals yet.</p>}
          <div className="chip-row">
            {goals.map((g, i) => {
              const c = categoryByKey(g.category);
              return <span key={i} className="chip static">{c ? c.icon : '🎯'} {c ? c.label : g.category} · {g.subGoal}</span>;
            })}
          </div>
        </section>

        <section className="card">
          <h2>Company goals</h2>
          {companyGoals.length === 0 && <p className="muted">No company goals set{member && member.role === 'admin' ? ' — head to Admin to add them.' : ' yet.'}</p>}
          <ul className="goal-list">
            {companyGoals.map((g, i) => (
              <li key={i}>
                <div className="goal-list-top">
                  <span>{categoryByKey(g.category)?.icon || '📈'} {g.title}</span>
                  <span className="muted">{g.metric || ''}</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${Math.min(100, g.progress || 12)}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Team right now <span className="muted">({freeNow.length} online)</span></h2>
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.id}>
                {statusDot(m.availability && m.availability.status)}
                <span className="member-name">{m.displayName}</span>
                <span className="muted small">{m.availability && m.availability.currentFocus ? `· ${m.availability.currentFocus}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent collection</h2>
            <Link className="link" to="/collection">View all</Link>
          </div>
          {creatures.length === 0 && <p className="muted">Complete a level-up to hatch your first creature.</p>}
          <div className="creature-row">
            {creatures.map((c) => (
              <div key={c.id} className="mini-creature">
                <Creature creature={c} size={84} />
                <div className="mini-name">{c.name}</div>
                <div className={`rarity rarity-${(c.rarity || '').toLowerCase()}`}>{c.rarity}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
