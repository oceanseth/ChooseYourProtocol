// ChooseYourProtocol — serverless API (single AWS Lambda behind API Gateway v2).
//
// Raw Lambda proxy handler (no framework) for fast cold starts. Routes are
// matched by method + normalized path. All privileged / tamper-sensitive work
// lives here behind Firebase ID-token verification:
//   - tenant bootstrap (org creation + role assignment + custom claims)
//   - PokéVibe session completion (vibe scoring + creature minting + KB write)
//   - desktop-agent signals, knowledge synthesis, availability, level-up alerts
const { initialize, admin } = require('../utils/firebaseInit');
const { scoreVibe, generateCreature } = require('../utils/creatureGen');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With,Accept,Origin',
  'Access-Control-Max-Age': '86400'
};

const LEVEL_UP_COOLDOWN_MS = 15 * 60 * 1000;

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function normalizePath(event) {
  let path = event.rawPath || event.path || '/';
  if (!path.startsWith('/')) path = '/' + path;
  // strip stage prefixes like /production
  path = path.replace(/^\/(production|prod|dev|local)(?=\/)/, '');
  if (path.startsWith('/api/')) path = path.slice(4);
  else if (path === '/api') path = '/';
  return path || '/';
}

function getMethod(event) {
  return event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET';
}

function parseBody(event) {
  if (!event.body) return {};
  let raw = event.body;
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getBearer(event) {
  const h = event.headers || {};
  const auth = h.Authorization || h.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

async function requireUser(event) {
  const token = getBearer(event);
  if (!token) return { error: json(401, { error: 'Missing bearer token' }) };
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { user: decoded };
  } catch {
    return { error: json(401, { error: 'Invalid or expired token' }) };
  }
}

function orgIdFromEmail(email) {
  if (!email || email.indexOf('@') === -1) return null;
  return email.split('@')[1].toLowerCase().trim();
}

function titleizeDomain(domain) {
  const label = domain.split('.')[0] || domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// POST /auth/bootstrap — create/join org from email domain, set custom claims.
async function handleBootstrap(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;

  const email = user.email;
  const orgId = orgIdFromEmail(email);
  if (!orgId) return json(400, { error: 'Account has no email domain to map to an organization' });

  const db = admin.firestore();
  const orgRef = db.collection('organizations').doc(orgId);
  const memberRef = orgRef.collection('members').doc(user.uid);

  const role = await db.runTransaction(async (tx) => {
    const orgSnap = await tx.get(orgRef);
    const memberSnap = await tx.get(memberRef);
    const now = admin.firestore.FieldValue.serverTimestamp();

    let assignedRole;
    if (!orgSnap.exists) {
      // First person from this domain founds the org and becomes admin.
      tx.set(orgRef, {
        domain: orgId,
        name: titleizeDomain(orgId),
        createdBy: user.uid,
        companyGoals: [],
        createdAt: now
      });
      assignedRole = 'admin';
    } else {
      assignedRole = memberSnap.exists ? (memberSnap.data().role || 'member') : 'member';
    }

    if (!memberSnap.exists) {
      tx.set(memberRef, {
        uid: user.uid,
        email: email || null,
        displayName: user.name || (email ? email.split('@')[0] : 'Member'),
        photoURL: user.picture || null,
        role: assignedRole,
        personalGoals: [],
        availability: { status: 'offline', idleSeconds: 0, currentFocus: null },
        joinedAt: now
      });
    } else {
      tx.set(memberRef, { email: email || null, photoURL: user.picture || null }, { merge: true });
      assignedRole = memberSnap.data().role || assignedRole;
    }

    tx.set(db.collection('users').doc(user.uid), { uid: user.uid, orgId, email: email || null, role: assignedRole }, { merge: true });
    return assignedRole;
  });

  // Stamp custom claims so Firestore rules can do tenant isolation.
  await admin.auth().setCustomUserClaims(user.uid, { orgId, role });

  const [orgSnap, memberSnap] = await Promise.all([orgRef.get(), memberRef.get()]);
  return json(200, {
    org: { id: orgId, ...orgSnap.data() },
    member: { ...memberSnap.data() },
    claims: { orgId, role }
  });
}

// POST /sessions/complete — score vibe, mint creatures, write KB source.
async function handleCompleteSession(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;
  const { orgId, sessionId } = parseBody(event);
  if (!orgId || !sessionId) return json(400, { error: 'orgId and sessionId required' });
  if (user.orgId && user.orgId !== orgId) return json(403, { error: 'Wrong organization' });

  const db = admin.firestore();
  const orgRef = db.collection('organizations').doc(orgId);
  const sessionRef = orgRef.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return json(404, { error: 'Session not found' });
  const session = sessionSnap.data();
  const participants = session.participants || [];
  if (!participants.includes(user.uid)) return json(403, { error: 'Not a participant' });

  // Idempotent: if already completed, return what was minted.
  if (session.status === 'completed' && Array.isArray(session.creatureIds)) {
    const existing = await Promise.all(
      session.creatureIds.map((id) => orgRef.collection('creatures').doc(id).get())
    );
    return json(200, { alreadyCompleted: true, vibe: session.vibe, creatures: existing.map((s) => ({ id: s.id, ...s.data() })) });
  }

  const msgsSnap = await sessionRef.collection('messages').orderBy('createdAt', 'asc').get();
  const messages = msgsSnap.docs.map((d) => d.data());

  const startedAt = session.startedAt && session.startedAt.toMillis ? session.startedAt.toMillis() : Date.now() - 60000;
  const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const vibe = scoreVibe({ messages, durationSeconds, topic: session.topic || '', category: session.category || 'social' });

  // Mint one creature per participant and record member names for "parents".
  const memberSnaps = await Promise.all(participants.map((uid) => orgRef.collection('members').doc(uid).get()));
  const parents = memberSnaps.map((s) => ({ uid: s.id, displayName: (s.data() || {}).displayName || 'Member' }));

  const batch = db.batch();
  const creatureIds = [];
  const creatures = [];
  for (const uid of participants) {
    const creatureRef = orgRef.collection('creatures').doc();
    const creature = generateCreature({ seed: `${sessionId}:${uid}`, vibe, parents });
    const payload = {
      ...creature,
      ownerUid: uid,
      sessionId,
      category: session.category || 'social',
      topic: session.topic || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    batch.set(creatureRef, payload);
    // Mirror into the owner's personal collection.
    batch.set(orgRef.collection('members').doc(uid).collection('collection').doc(creatureRef.id), payload);
    creatureIds.push(creatureRef.id);
    creatures.push({ id: creatureRef.id, ...payload });
  }

  // The conversation becomes a knowledge-base source.
  const kbRef = orgRef.collection('knowledgeBase').doc();
  const transcript = messages.map((m) => m.text).filter(Boolean).join(' • ').slice(0, 2000);
  batch.set(kbRef, {
    title: session.topic ? `Level-up: ${session.topic}` : 'Level-up conversation',
    summary: `${parents.map((p) => p.displayName).join(' & ')} held a ${vibe.durationSeconds}s ${session.activity || 'plank'} while discussing "${session.topic || 'an open topic'}". Vibe: ${vibe.descriptor}.`,
    transcript,
    category: session.category || 'social',
    topic: session.topic || '',
    contributorUids: participants,
    source: 'activity',
    sessionId,
    vibe,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  batch.set(sessionRef, {
    status: 'completed',
    vibe,
    creatureIds,
    knowledgeSourceId: kbRef.id,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await batch.commit();
  return json(200, { vibe, creatures, knowledgeSourceId: kbRef.id });
}

// POST /agent/signals — store a work-context signal + update availability.
async function handleAgentSignals(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;
  const orgId = user.orgId || orgIdFromEmail(user.email);
  if (!orgId) return json(400, { error: 'No organization for user' });

  const body = parseBody(event);
  const db = admin.firestore();
  const orgRef = db.collection('organizations').doc(orgId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const idleSeconds = Number(body.idleSeconds || 0);
  const status = body.category === 'idle' || idleSeconds > 180 ? 'idle' : 'active';

  await orgRef.collection('signals').add({
    uid: user.uid,
    type: body.type || 'work_context',
    category: body.category || 'browsing',
    app: body.app || null,
    title: body.title || null,
    idleSeconds,
    capturedAt: body.capturedAt || null,
    createdAt: now
  });

  await orgRef.collection('members').doc(user.uid).set({
    availability: {
      status,
      idleSeconds,
      currentFocus: body.title || body.app || null,
      lastSeenAt: now
    }
  }, { merge: true });

  // Surface any pending level-up alert for this user so the agent can notify them.
  const alertSnap = await orgRef.collection('alerts')
    .where('uid', '==', user.uid)
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .catch(() => null);

  let alert = null;
  if (alertSnap && !alertSnap.empty) {
    const d = alertSnap.docs[0];
    alert = { id: d.id, ...d.data(), createdAt: undefined };
  }
  return json(200, { ok: true, status, alert });
}

// POST /agent/knowledge — append synthesized knowledge-base entries.
async function handleAgentKnowledge(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;
  const orgId = user.orgId || orgIdFromEmail(user.email);
  if (!orgId) return json(400, { error: 'No organization for user' });

  const body = parseBody(event);
  const entries = Array.isArray(body.entries) ? body.entries : [body];
  const db = admin.firestore();
  const orgRef = db.collection('organizations').doc(orgId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  let written = 0;
  const batch = db.batch();
  for (const e of entries) {
    if (!e || !e.title) continue;
    batch.set(orgRef.collection('knowledgeBase').doc(), {
      title: String(e.title).slice(0, 200),
      summary: String(e.summary || '').slice(0, 2000),
      topics: Array.isArray(e.topics) ? e.topics.slice(0, 12).map(String) : [],
      category: e.category || 'general',
      contributorUids: [user.uid],
      source: 'agent',
      createdAt: now
    });
    written++;
  }
  if (written) await batch.commit();
  return json(200, { written });
}

// GET /agent/org-availability — snapshot of org members for the coordinator agent.
async function handleOrgAvailability(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;
  const orgId = user.orgId || orgIdFromEmail(user.email);
  if (!orgId) return json(400, { error: 'No organization for user' });

  const db = admin.firestore();
  const membersSnap = await db.collection('organizations').doc(orgId).collection('members').get();
  const members = membersSnap.docs.map((d) => {
    const m = d.data();
    const av = m.availability || {};
    return {
      uid: d.id,
      displayName: m.displayName || 'Member',
      status: av.status || 'offline',
      idleSeconds: av.idleSeconds || 0,
      currentFocus: av.currentFocus || null,
      lastSeenAt: av.lastSeenAt && av.lastSeenAt.toMillis ? av.lastSeenAt.toMillis() : null,
      personalGoals: (m.personalGoals || []).map((g) => (typeof g === 'string' ? g : g.category)).filter(Boolean)
    };
  });
  return json(200, { now: Date.now(), members });
}

// POST /agent/level-up — create level-up alerts for free members (with cooldown).
async function handleLevelUp(event) {
  const { user, error } = await requireUser(event);
  if (error) return error;
  const orgId = user.orgId || orgIdFromEmail(user.email);
  if (!orgId) return json(400, { error: 'No organization for user' });

  const body = parseBody(event);
  const participantUids = (body.participantUids || []).filter(Boolean);
  if (participantUids.length < 2) return json(400, { error: 'Need at least 2 participants' });

  const db = admin.firestore();
  const orgRef = db.collection('organizations').doc(orgId);

  // Cooldown: skip if any participant already has a recent pending alert.
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - LEVEL_UP_COOLDOWN_MS);
  const recent = await orgRef.collection('alerts')
    .where('uid', '==', participantUids[0])
    .where('createdAt', '>', cutoff)
    .limit(1)
    .get()
    .catch(() => null);
  if (recent && !recent.empty) return json(200, { skipped: true, reason: 'cooldown' });

  const now = admin.firestore.FieldValue.serverTimestamp();
  const opportunityId = orgRef.collection('alerts').doc().id;
  const batch = db.batch();
  for (const uid of participantUids) {
    batch.set(orgRef.collection('alerts').doc(), {
      uid,
      opportunityId,
      participants: participantUids,
      category: body.category || 'social',
      topic: body.topic || 'Take a 2-minute level-up break',
      reason: body.reason || 'Multiple teammates are free right now',
      scheduledFor: body.scheduledFor || null,
      status: 'pending',
      createdAt: now
    });
  }
  await batch.commit();
  return json(200, { created: participantUids.length, opportunityId });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
exports.handler = async (event) => {
  const method = getMethod(event);
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  const path = normalizePath(event);

  try {
    if (method === 'GET' && path === '/health') return json(200, { ok: true, service: 'chooseyourprotocol-api' });

    await initialize();

    if (method === 'POST' && path === '/auth/bootstrap') return await handleBootstrap(event);
    if (method === 'POST' && path === '/sessions/complete') return await handleCompleteSession(event);
    if (method === 'POST' && path === '/agent/signals') return await handleAgentSignals(event);
    if (method === 'POST' && path === '/agent/knowledge') return await handleAgentKnowledge(event);
    if (method === 'GET' && path === '/agent/org-availability') return await handleOrgAvailability(event);
    if (method === 'POST' && path === '/agent/level-up') return await handleLevelUp(event);

    return json(404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error('API error:', err);
    return json(500, { error: 'Internal server error', message: err.message });
  }
};
