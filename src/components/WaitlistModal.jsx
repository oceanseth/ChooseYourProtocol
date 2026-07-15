import React, { useEffect, useRef, useState } from 'react';
import { LogoMark } from './Logo.jsx';
import { WAITLIST_URL } from '../config.js';

// Early-access waitlist popup.
// Calls POST `${WAITLIST_URL}/join` with { email, description } and renders the
// contract's response states (author: SeniorDev):
//   { status: 'accepted' }         -> "thanks, we'll be in touch"
//   { status: 'already_received' } -> "you're already on the list"
//   { status: 'invalid' } / 4xx/5xx -> soft retry
// WAITLIST_URL defaults to our own API base (src/config.js) -> POST /api/join.

// Format-only check; the server does authoritative dedupe + deliverability.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DESC_MAX = 500;

export default function WaitlistModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // 'accepted' | 'already_received'
  const [error, setError] = useState('');
  const firstFieldRef = useRef(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const descValid = description.trim().length >= 3 && description.trim().length <= DESC_MAX;
  const canSubmit = emailValid && descValid && !submitting;

  useEffect(() => {
    if (!open) return;
    setEmail(''); setDescription(''); setTouched(false);
    setSubmitting(false); setResult(null); setError('');
    const t = setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || !descValid) return; // never submit an invalid address
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${WAITLIST_URL}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), description: description.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.status === 'accepted' || data.status === 'already_received')) {
        setResult(data.status);
      } else if (data.status === 'invalid') {
        setError(data.message || 'Please double-check your email and description.');
      } else {
        throw new Error(`HTTP ${res.status} — unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('[waitlist] join request failed:', err);
      setError("Something went wrong on our end. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose?.(); };
  const remaining = DESC_MAX - description.length;

  return (
    <div className="wl-backdrop" onMouseDown={onBackdrop} role="presentation">
      <div className="wl-modal" role="dialog" aria-modal="true" aria-labelledby="wl-title">
        <button className="wl-close" onClick={onClose} aria-label="Close">×</button>

        {result ? (
          <div className="wl-done">
            <div className={`wl-badge ${result === 'already_received' ? 'is-info' : 'is-good'}`}>
              <LogoMark size={22} />
            </div>
            {result === 'accepted' ? (
              <>
                <h2 id="wl-title">You're on the list.</h2>
                <p>Thank you — we'll email you when a slot opens up. Keep an eye on your inbox.</p>
              </>
            ) : (
              <>
                <h2 id="wl-title">You're already on the list.</h2>
                <p>We've already got your request — no need to send it twice. We'll be in touch when a slot opens up.</p>
              </>
            )}
            <button className="btn btn-primary btn-lg wl-block" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="wl-form" onSubmit={handleSubmit} noValidate>
            <span className="wl-eyebrow"><LogoMark size={20} /> Early access</span>
            <h2 id="wl-title">Request an invite</h2>
            <p className="wl-lead">
              StackMax is in early access. Drop your email and how you'd like to use it —
              we'll send an invite when a slot opens up.
            </p>

            <label className="wl-field">
              <span>Email</span>
              <input
                ref={firstFieldRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && email.trim() !== '' && !emailValid}
              />
              {touched && email.trim() && !emailValid && (
                <span className="wl-hint">Enter a valid email address.</span>
              )}
            </label>

            <label className="wl-field">
              <span>How would you like to use StackMax?</span>
              <textarea
                rows={4}
                maxLength={DESC_MAX}
                placeholder="e.g. tracking a daily skincare protocol with a small accountability group…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && description.trim() !== '' && !descValid}
              />
              <span className={`wl-counter ${remaining < 40 ? 'is-low' : ''}`}>{remaining} left</span>
              {touched && description.trim() && description.trim().length < 3 && (
                <span className="wl-hint">Tell us a little more (a few words is fine).</span>
              )}
            </label>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg wl-block" disabled={!canSubmit}>
              {submitting ? 'Sending…' : 'Request invite'}
            </button>
            <p className="wl-fine">We only use your email to send an invite. No spam.</p>
          </form>
        )}
      </div>
    </div>
  );
}
