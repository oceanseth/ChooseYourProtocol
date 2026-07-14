import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo.jsx';

export const DECK_URL =
  'https://docs.google.com/presentation/d/11MZwAIJX6FNa1xT2bAP2PKtAnsk8JbVJunHnGo4M6Qk/edit?usp=sharing';

export default function About() {
  return (
    <div className="about-page">
      <header className="about-bar">
        <Link to="/" className="brand"><LogoMark size={20} /> <span>ChooseYourProtocol</span></Link>
        <div className="row-gap">
          <a className="btn btn-ghost" href={DECK_URL} target="_blank" rel="noreferrer">Pitch deck ↗</a>
          <Link className="btn btn-primary" to="/">Enter app</Link>
        </div>
      </header>

      <section className="about-hero">
        <h1>The Hidden Function of the Smoke Break</h1>
        <p className="tagline">A social operating system for modern organizations.</p>
      </section>

      <img
        className="about-slide"
        src="/smoke-break.jpg"
        alt="The Hidden Function of the Smoke Break — Version 1.0 the accidental OS versus Version 2.0 Choose Your Protocol"
      />

      <section className="about-cols">
        <div className="about-col">
          <h3>Version 1.0 — The Accidental OS</h3>
          <p className="muted">“It wasn't about smoking.”</p>
          <p>The smoke break quietly created recurring human connection, mentorship, trust, and cross-team friendships. It was an operating system for culture that nobody designed — and that mostly disappeared.</p>
        </div>
        <div className="about-col">
          <h3>Version 2.0 — Choose Your Protocol</h3>
          <p>We rebuild that ritual on purpose. An agent watches how your team works, learns what each person wants to grow into, and pulls two free people away from their desks for 90 seconds of movement, novel connection, and a guided conversation — then turns that moment into a reward and a knowledge asset.</p>
        </div>
      </section>

      <section className="about-loop">
        <h2>The loop</h2>
        <div className="loop-steps">
          <span>🤖 Agent captures context</span>
          <span>🎯 You set a goal</span>
          <span>⚡ Level-up opportunity fires</span>
          <span>🤝 Matched micro-activity</span>
          <span>✨ Earn a PokéVibe creature</span>
          <span>🧱 Knowledge base grows</span>
        </div>
      </section>

      <section className="about-cta">
        <a className="btn btn-primary btn-lg" href={DECK_URL} target="_blank" rel="noreferrer">📊 View the pitch deck</a>
        <Link className="btn btn-ghost btn-lg" to="/">Try ChooseYourProtocol →</Link>
      </section>
    </div>
  );
}
