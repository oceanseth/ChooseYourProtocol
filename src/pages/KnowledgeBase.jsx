import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { categoryByKey } from '../lib/goals.js';
import {
  db, collection, query, orderBy, onSnapshot
} from '../firebase.js';

export default function KnowledgeBase() {
  const { orgId, org } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!orgId) return undefined;
    return onSnapshot(
      query(collection(db, 'organizations', orgId, 'knowledgeBase'), orderBy('createdAt', 'desc')),
      (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
  }, [orgId]);

  const shown = filter === 'all' ? entries : entries.filter((e) => e.source === filter);

  return (
    <div className="knowledge">
      <div className="page-head">
        <h1>{org && org.name} Knowledge Base</h1>
        <div className="tabs">
          <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`tab ${filter === 'agent' ? 'active' : ''}`} onClick={() => setFilter('agent')}>🤖 From agent</button>
          <button className={`tab ${filter === 'activity' ? 'active' : ''}`} onClick={() => setFilter('activity')}>⚡ From level-ups</button>
        </div>
      </div>
      <p className="muted">Sources captured by the desktop agent as people work, plus knowledge surfaced in level-up conversations.</p>

      {shown.length === 0 && <p className="muted">No sources yet. Run the desktop agent or complete a level-up to start filling the knowledge base.</p>}

      <div className="kb-list">
        {shown.map((e) => (
          <article key={e.id} className="kb-item">
            <div className="kb-top">
              <span className="kb-source">{e.source === 'agent' ? '🤖 Agent' : '⚡ Level-up'}</span>
              {e.category && <span className="chip static small">{categoryByKey(e.category)?.icon || '🏷️'} {e.category}</span>}
            </div>
            <h3>{e.title}</h3>
            <p>{e.summary}</p>
            {e.topics && e.topics.length > 0 && (
              <div className="topic-tags">
                {e.topics.map((t, i) => <span key={i} className="tag">#{t}</span>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
