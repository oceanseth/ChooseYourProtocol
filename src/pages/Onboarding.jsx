import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { CATEGORIES } from '../lib/goals.js';
import { db, doc, updateDoc } from '../firebase.js';

export default function Onboarding() {
  const { orgId, user, member, refresh } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [subGoal, setSubGoal] = useState(null);
  const [busy, setBusy] = useState(false);

  const cat = CATEGORIES.find((c) => c.key === category);

  const save = async () => {
    if (!category || !subGoal) return;
    setBusy(true);
    try {
      const goal = { category, subGoal, createdAt: Date.now() };
      const existing = (member && member.personalGoals) || [];
      await updateDoc(doc(db, 'organizations', orgId, 'members', user.uid), {
        personalGoals: [...existing, goal]
      });
      await refresh();
      navigate('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <h1>Pick your first protocol</h1>
        <p className="muted">What do you want to level up? Your agent will match you with teammates chasing the same thing.</p>

        <div className="goal-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`goal-card ${category === c.key ? 'selected' : ''}`}
              onClick={() => { setCategory(c.key); setSubGoal(null); }}
            >
              <div className="goal-icon">{c.icon}</div>
              <div className="goal-label">{c.label}</div>
              <div className="goal-blurb">{c.blurb}</div>
            </button>
          ))}
        </div>

        {cat && (
          <div className="subgoals">
            <h3>Choose a focus</h3>
            <div className="chip-row">
              {cat.subGoals.map((sg) => (
                <button
                  key={sg.key}
                  className={`chip ${subGoal === sg.key ? 'selected' : ''}`}
                  onClick={() => setSubGoal(sg.key)}
                >
                  {sg.label} <span className="chip-sub">· {sg.activity}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-lg" disabled={!category || !subGoal || busy} onClick={save}>
          {busy ? 'Saving…' : 'Start leveling up →'}
        </button>
      </div>
    </div>
  );
}
