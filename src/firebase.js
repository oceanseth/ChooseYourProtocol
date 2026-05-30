// Firebase client initialization + auth/firestore helpers for ChooseYourProtocol.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { config } from './config.js';

const app = initializeApp(config.firebase);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

export function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return fbSignOut(auth);
}

// Get a fresh Firebase ID token (optionally forcing a refresh to pick up
// newly-set custom claims such as orgId / role after bootstrap).
export async function getIdToken(forceRefresh = false) {
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

// Read the decoded custom claims from the current user's token.
export async function getClaims(forceRefresh = false) {
  if (!auth.currentUser) return null;
  const res = await auth.currentUser.getIdTokenResult(forceRefresh);
  return res.claims;
}

// Re-export the Firestore primitives the app uses so pages import from one place.
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
};
