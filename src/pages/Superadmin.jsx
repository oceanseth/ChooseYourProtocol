import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

// Back-office dashboard, gated by the `superadmin` custom claim. The UI guard
// here is cosmetic — the API rejects non-superadmin tokens with a 403 anyway.
export default function Superadmin() {
  const { isSuperadmin, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSuperadmin) return;
    api.superadminWaitlist()
      .then((res) => setEntries(res.entries))
      .catch((err) => {
        console.error('[superadmin] waitlist fetch failed:', err);
        setError(err.message || 'Failed to load the waitlist.');
      });
  }, [isSuperadmin]);

  if (authLoading) return null;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  return (
    <div className="admin">
      <h1>Superadmin · Waitlist</h1>
      <p className="muted">Early-access signups from the landing page, newest first.</p>

      {error && <div className="form-error">{error}</div>}
      {!error && entries === null && <p className="muted">Loading…</p>}

      {entries && (
        <section className="card">
          <h2>{entries.length} signup{entries.length === 1 ? '' : 's'}</h2>
          {entries.length === 0 ? (
            <p className="muted">No one on the waitlist yet.</p>
          ) : (
            <ul className="member-list">
              {entries.map((e) => (
                <li key={e.email}>
                  <span className="member-name">{e.email}</span>
                  <span className="muted small">{e.description}</span>
                  <span className="muted small">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
