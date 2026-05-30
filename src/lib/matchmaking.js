// Realtime 2-person matchmaking over Firestore.
//
// Two browsers in the same org coordinate without a server matchmaker:
// a joiner first looks for someone already waiting in the same goal category
// and atomically claims them inside a transaction (creating the shared
// session). If nobody is waiting, the joiner posts a "waiting" queue entry and
// listens until a partner claims it.
import {
  db, collection, query, where, getDocs, doc, setDoc, deleteDoc,
  onSnapshot, runTransaction, serverTimestamp
} from '../firebase.js';
import { pickTopic, categoryByKey } from './goals.js';

function activityFor(category) {
  const cat = categoryByKey(category);
  return (cat && cat.subGoals[0] && cat.subGoals[0].activity) || 'Plank hold';
}

// Returns { cancel } and invokes onMatched(sessionId) exactly once.
export async function joinQueue({ orgId, me, category }, onMatched) {
  const queueCol = collection(db, 'organizations', orgId, 'queue');
  const myRef = doc(queueCol, me.uid);

  // 1) Look for a waiting partner in the same category.
  const waitingSnap = await getDocs(
    query(queueCol, where('status', '==', 'waiting'), where('category', '==', category))
  );
  const partner = waitingSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .find((d) => d.uid && d.uid !== me.uid);

  if (partner) {
    try {
      const sessionRef = doc(collection(db, 'organizations', orgId, 'sessions'));
      const partnerRef = doc(queueCol, partner.uid);
      await runTransaction(db, async (tx) => {
        const partnerSnap = await tx.get(partnerRef);
        if (!partnerSnap.exists() || partnerSnap.data().status !== 'waiting') {
          throw new Error('partner-taken');
        }
        const topic = pickTopic(category);
        tx.set(sessionRef, {
          participants: [partner.uid, me.uid],
          participantNames: { [partner.uid]: partner.displayName || 'Member', [me.uid]: me.displayName || 'Member' },
          category,
          activity: activityFor(category),
          topic,
          status: 'active',
          startedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: me.uid
        });
        tx.set(partnerRef, { status: 'matched', sessionId: sessionRef.id }, { merge: true });
        tx.set(myRef, {
          uid: me.uid,
          displayName: me.displayName || 'Member',
          category,
          status: 'matched',
          sessionId: sessionRef.id,
          createdAt: serverTimestamp()
        });
      });
      onMatched(sessionRef.id);
      return { cancel: async () => {} };
    } catch (e) {
      // Partner was claimed by someone else — fall through to waiting.
    }
  }

  // 2) Post a waiting entry and listen for a partner to claim it.
  await setDoc(myRef, {
    uid: me.uid,
    displayName: me.displayName || 'Member',
    category,
    status: 'waiting',
    createdAt: serverTimestamp()
  });

  let done = false;
  const unsub = onSnapshot(myRef, (snap) => {
    const data = snap.data();
    if (!done && data && data.status === 'matched' && data.sessionId) {
      done = true;
      unsub();
      onMatched(data.sessionId);
    }
  });

  return {
    cancel: async () => {
      done = true;
      unsub();
      try { await deleteDoc(myRef); } catch {}
    }
  };
}
