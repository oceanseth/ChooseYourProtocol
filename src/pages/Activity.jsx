import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { CATEGORIES, categoryByKey } from '../lib/goals.js';
import { joinQueue } from '../lib/matchmaking.js';
import Creature from '../components/Creature.jsx';
import { api } from '../api.js';
import {
  db, doc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp
} from '../firebase.js';

const MIN_SECONDS = 20; // minimum hold before you can complete (demo-friendly)

export default function Activity() {
  const { orgId, user, member } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const defaultCategory =
    params.get('category') ||
    (member && member.personalGoals && member.personalGoals[0] && member.personalGoals[0].category) ||
    'social';

  const [phase, setPhase] = useState('lobby'); // lobby | waiting | active | done
  const [category, setCategory] = useState(defaultCategory);
  const [session, setSession] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [myCreature, setMyCreature] = useState(null);
  const [finalizing, setFinalizing] = useState(false);

  const queueCtl = useRef(null);
  const timerRef = useRef(null);

  // ---- matchmaking ----
  const find = async () => {
    setPhase('waiting');
    const me = { uid: user.uid, displayName: (member && member.displayName) || 'Member' };
    queueCtl.current = await joinQueue({ orgId, me, category }, (sid) => {
      setSessionId(sid);
      setPhase('active');
    });
  };

  const cancel = async () => {
    if (queueCtl.current) await queueCtl.current.cancel();
    queueCtl.current = null;
    setPhase('lobby');
  };

  useEffect(() => () => { if (queueCtl.current) queueCtl.current.cancel(); }, []);

  // ---- subscribe to the matched session + messages ----
  useEffect(() => {
    if (!sessionId || !orgId) return undefined;
    const sRef = doc(db, 'organizations', orgId, 'sessions', sessionId);
    const unsubS = onSnapshot(sRef, (snap) => {
      if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
    });
    const unsubM = onSnapshot(
      query(collection(sRef, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubS(); unsubM(); };
  }, [sessionId, orgId]);

  // ---- plank timer ----
  useEffect(() => {
    if (phase !== 'active') return undefined;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ---- auto-finalize when the partner completes ----
  useEffect(() => {
    if (session && session.status === 'completed' && !myCreature && !finalizing) {
      finalize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addDoc(collection(db, 'organizations', orgId, 'sessions', sessionId, 'messages'), {
      senderUid: user.uid,
      senderName: (member && member.displayName) || 'Member',
      text,
      createdAt: serverTimestamp()
    });
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      const res = await api.completeSession(orgId, sessionId);
      const mine = (res.creatures || []).find((c) => c.ownerUid === user.uid);
      setMyCreature(mine || (res.creatures && res.creatures[0]) || null);
      setPhase('done');
    } catch (e) {
      alert('Could not complete the level-up: ' + e.message);
    } finally {
      setFinalizing(false);
    }
  };

  // ---------- RENDER ----------
  if (phase === 'lobby') {
    return (
      <div className="activity lobby">
        <h1>⚡ Start a level-up</h1>
        <p className="muted">A 2-minute micro-activity: hold a plank with a teammate while you talk through an agent-chosen prompt. Finish it and you both hatch a creature.</p>
        <h3>Pick a track</h3>
        <div className="chip-row">
          {CATEGORIES.map((c) => (
            <button key={c.key} className={`chip ${category === c.key ? 'selected' : ''}`} onClick={() => setCategory(c.key)}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={find}>Find a teammate →</button>
        <p className="hint">Demo tip: open this page in a second browser (or have a teammate join) to get matched.</p>
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="activity waiting">
        <div className="spinner big" />
        <h2>Looking for a {categoryByKey(category)?.label} teammate…</h2>
        <p className="muted">You'll be matched the moment someone else joins this track.</p>
        <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
      </div>
    );
  }

  if (phase === 'done' && myCreature) {
    return (
      <div className="activity done">
        <div className="birth">
          <div className="birth-burst" />
          <Creature creature={myCreature} size={220} />
        </div>
        <h1>✨ You hatched {myCreature.name}!</h1>
        <div className={`rarity-badge rarity-${(myCreature.rarity || '').toLowerCase()}`}>{myCreature.rarity} · {myCreature.species}</div>
        <p className="vibe-line">Born from {myCreature.nature}.</p>
        <div className="stat-grid">
          {Object.entries(myCreature.stats || {}).map(([k, v]) => (
            <div key={k} className="stat"><span className="stat-k">{k}</span><span className="stat-v">{v}</span></div>
          ))}
        </div>
        <p className="muted">Added to your collection and contributed to your org's knowledge base.</p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={() => navigate('/collection')}>View collection</button>
          <button className="btn btn-ghost" onClick={() => { setPhase('lobby'); setSession(null); setSessionId(null); setMessages([]); setElapsed(0); setMyCreature(null); }}>Level up again</button>
        </div>
      </div>
    );
  }

  // active
  const partnerName = session
    ? Object.entries(session.participantNames || {}).find(([uid]) => uid !== user.uid)?.[1] || 'Your teammate'
    : 'Your teammate';
  const canComplete = elapsed >= MIN_SECONDS;

  return (
    <div className="activity active">
      <div className="activity-main">
        <div className="topic-card">
          <span className="badge">{categoryByKey(session?.category)?.icon} {session?.activity || 'Plank hold'}</span>
          <h2>with {partnerName}</h2>
          <p className="topic">“{session?.topic}”</p>
        </div>

        <div className="plank">
          <div className={`plank-ring ${canComplete ? 'ready' : ''}`}>
            <span className="plank-time">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
            <span className="plank-label">{canComplete ? 'hold strong 💪' : `hold ${MIN_SECONDS - elapsed}s more`}</span>
          </div>
          <button className="btn btn-primary btn-lg" disabled={!canComplete || finalizing} onClick={finalize}>
            {finalizing ? 'Hatching…' : 'Complete level-up ✨'}
          </button>
        </div>
      </div>

      <div className="chat">
        <h3>Conversation</h3>
        <div className="chat-log">
          {messages.length === 0 && <p className="muted small">Say hi and dig into the prompt together…</p>}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.senderUid === user.uid ? 'mine' : 'theirs'}`}>
              <span className="msg-name">{m.senderName}</span>
              <span className="msg-text">{m.text}</span>
            </div>
          ))}
        </div>
        <form className="chat-input" onSubmit={sendMessage}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
          <button className="btn btn-primary" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
