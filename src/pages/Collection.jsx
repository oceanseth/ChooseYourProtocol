import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import Creature from '../components/Creature.jsx';
import {
  db, collection, query, orderBy, where, onSnapshot
} from '../firebase.js';

function CreatureCard({ c }) {
  return (
    <div className="creature-card">
      <Creature creature={c} size={140} />
      <div className="creature-meta">
        <div className="creature-name">{c.name}</div>
        <div className={`rarity rarity-${(c.rarity || '').toLowerCase()}`}>{c.rarity} · {c.species}</div>
        <div className="creature-nature">{c.nature}</div>
        <div className="stat-row">
          {Object.entries(c.stats || {}).map(([k, v]) => (
            <span key={k} className="stat-mini" title={k}>{k[0].toUpperCase()}{v}</span>
          ))}
        </div>
        {c.parents && c.parents.length > 0 && (
          <div className="parents muted small">born of {c.parents.map((p) => p.displayName).join(' & ')}</div>
        )}
      </div>
    </div>
  );
}

export default function Collection() {
  const { orgId, user } = useAuth();
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState([]);
  const [dex, setDex] = useState([]);

  useEffect(() => {
    if (!orgId || !user) return undefined;
    const unsubMine = onSnapshot(
      query(collection(db, 'organizations', orgId, 'members', user.uid, 'collection'), orderBy('createdAt', 'desc')),
      (snap) => setMine(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubDex = onSnapshot(
      query(collection(db, 'organizations', orgId, 'creatures'), orderBy('createdAt', 'desc')),
      (snap) => setDex(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { unsubMine(); unsubDex(); };
  }, [orgId, user]);

  const list = tab === 'mine' ? mine : dex;

  return (
    <div className="collection">
      <div className="page-head">
        <h1>Collection</h1>
        <div className="tabs">
          <button className={`tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>My creatures ({mine.length})</button>
          <button className={`tab ${tab === 'dex' ? 'active' : ''}`} onClick={() => setTab('dex')}>Team Dex ({dex.length})</button>
        </div>
      </div>
      {list.length === 0 && <p className="muted">No creatures yet — complete a level-up to hatch one.</p>}
      <div className="creature-grid">
        {list.map((c) => <CreatureCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
