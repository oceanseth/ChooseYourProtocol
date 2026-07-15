import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthChange, getIdToken, getClaims, signOut as fbSignOut, db, doc, getDoc } from './firebase.js';
import { api } from './api.js';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [member, setMember] = useState(null);
  const [role, setRole] = useState(null);
  const [superadmin, setSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Re-read the caller's member + org docs from Firestore.
  const refresh = useCallback(async (orgId, uid) => {
    if (!orgId || !uid) return;
    const [orgSnap, memberSnap] = await Promise.all([
      getDoc(doc(db, 'organizations', orgId)),
      getDoc(doc(db, 'organizations', orgId, 'members', uid))
    ]);
    if (orgSnap.exists()) setOrg({ id: orgId, ...orgSnap.data() });
    if (memberSnap.exists()) setMember({ id: uid, ...memberSnap.data() });
  }, []);

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      setLoading(true);
      setError(null);
      if (!fbUser) {
        setUser(null);
        setOrg(null);
        setMember(null);
        setRole(null);
        setSuperadmin(false);
        setLoading(false);
        return;
      }
      setUser(fbUser);
      try {
        // Ensure the user has a token, then bootstrap their org membership.
        await getIdToken(false);
        const res = await api.bootstrap();
        // Bootstrap set custom claims (orgId, role) — force a token refresh so
        // Firestore rules see them on subsequent reads/writes.
        await getIdToken(true);
        const claims = await getClaims();
        setRole(res.claims.role);
        setSuperadmin(claims?.superadmin === true);
        setOrg(res.org);
        setMember(res.member);
      } catch (e) {
        console.error('bootstrap failed', e);
        setError(e.message || 'Failed to set up your account');
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const value = {
    user,
    org,
    member,
    role,
    orgId: org && org.id,
    loading,
    error,
    isAdmin: role === 'admin',
    isSuperadmin: superadmin,
    refresh: () => (org && user ? refresh(org.id, user.uid) : Promise.resolve()),
    signOut: () => fbSignOut(),
    setMember
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
