import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo.jsx';
import { signInEmail, signUpEmail, signInGoogle } from '../firebase.js';
import { DECK_URL } from './About.jsx';

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'signin') await signInEmail(email, password);
      else await signUpEmail(email, password);
      // AuthProvider takes over (bootstrap + redirect).
    } catch (e2) {
      setErr(e2.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInGoogle();
    } catch (e2) {
      setErr(e2.message.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1><LogoMark size={30} /> ChooseYourProtocol</h1>
        <p className="tagline">The modern smoke break. Agent-timed micro-activities that level up your people, your systems, and your culture.</p>
        <ul className="hero-points">
          <li>🤖 A desktop agent builds your knowledge base as you work</li>
          <li>🎯 Set fitness, social &amp; business goals</li>
          <li>⚡ Get matched for a 2-minute level-up when teammates are free</li>
          <li>✨ Earn a rare PokéVibe creature from every conversation</li>
        </ul>
        <p className="hero-links">
          <Link to="/about">Read the story →</Link>
          <a href={DECK_URL} target="_blank" rel="noreferrer">Pitch deck ↗</a>
        </p>
      </div>

      <div className="auth-card">
        <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">Sign in with your work email — your organization is created automatically.</p>
        <form onSubmit={submit}>
          <label>Work email
            <input type="email" value={email} required placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>Password
            <input type="password" value={password} required placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)} />
          </label>
          {err && <div className="form-error">{err}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div className="divider"><span>or</span></div>
        <button className="btn btn-google btn-block" onClick={google} disabled={busy}>
          Continue with Google
        </button>
        <p className="switch-mode">
          {mode === 'signin' ? "No account yet?" : 'Already have an account?'}{' '}
          <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
