import React from 'react';
import { Link } from 'react-router-dom';
import appPreview from '../assets/app-preview.png';
import { Wordmark, LogoMark } from '../components/Logo.jsx';

const GITHUB_URL = 'https://github.com/oceanseth/ChooseYourProtocol';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <Wordmark markSize={30} />
        <nav className="landing-nav">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <Link to="/about">About</Link>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <span className="landing-eyebrow">AI-coached accountability</span>
        <h1>Prove your progress.<br /><span className="hero-accent">Together.</span></h1>
        <p className="landing-tagline">
          StackMax turns any goal into a measured <strong>protocol</strong> with a community that
          keeps you honest. Track it, prove it, and level up alongside people chasing the same thing —
          coached by an AI accountability agent that decides what to measure and how often.
        </p>
        <div className="landing-cta">
          <a className="btn btn-primary btn-lg" href="#get-the-app">Get the app</a>
          <Link className="btn btn-ghost btn-lg" to="/login">I have an account →</Link>
        </div>
      </section>

      {/* Shaped light "spotlight" panel — the phone lives inside a device frame,
          and the primary Get-the-app CTA lives in this same light section. */}
      <section id="get-the-app" className="spotlight">
        <div className="spotlight-inner">
          <div className="spotlight-copy">
            <span className="spotlight-eyebrow">
              <LogoMark size={20} /> Get the app
            </span>
            <h2>Your protocol, in your pocket.</h2>
            <p>
              StackMax is in early access. The iOS beta is coming soon — the source is public
              while we build in the open.
            </p>
            <div className="landing-cta spotlight-cta">
              <a className="btn btn-primary btn-lg" href={GITHUB_URL} target="_blank" rel="noreferrer">
                ⭐ Star us on GitHub
              </a>
              <Link className="btn btn-outline btn-lg" to="/login">I have an account →</Link>
            </div>
          </div>
          <div className="spotlight-device">
            <div className="device-frame">
              <span className="device-notch" aria-hidden="true" />
              <img
                src={appPreview}
                alt="StackMax app on iPhone showing a protocol dashboard with a 12-day streak and daily check-ins"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-how">
        <h2>How it works</h2>
        <div className="landing-cols">
          <div className="landing-col">
            <span className="step-num">1</span>
            <h3>Tell Max a goal</h3>
            <p>Even a vague one — "I want good skin." Max, your accountability coach, turns it into a concrete protocol.</p>
          </div>
          <div className="landing-col">
            <span className="step-num">2</span>
            <h3>Get measured metrics</h3>
            <p>Max picks what to track and how often — pimple count from a daily photo, perceived age monthly — with the proof to back each win.</p>
          </div>
          <div className="landing-col">
            <span className="step-num">3</span>
            <h3>Join a protocol group</h3>
            <p>Every goal becomes a group of people running the same protocol. See their streaks, celebrate wins, stay accountable.</p>
          </div>
          <div className="landing-col">
            <span className="step-num">4</span>
            <h3>Prove it</h3>
            <p>Progress is verified — photo, device, or lab — not just self-reported. Provable wins, real streaks, honest data.</p>
          </div>
        </div>
      </section>

      <section className="landing-honest">
        <h2>Built honest</h2>
        <p>
          StackMax is an <strong>AI-orchestrated community</strong>. Some participants and content are
          AI-generated to help new groups grow, and are labeled as such. We don't guarantee the accuracy
          of any measurement or claim. By using StackMax you agree to our{' '}
          <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <footer className="landing-footer">
        <span>StackMax · ChooseYourProtocol · AI-orchestrated community. Data may be AI-generated and is not guaranteed accurate.</span>
        <nav>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/about">About</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}
