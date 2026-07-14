import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import appPreview from '../assets/app-preview.png';
import step1 from '../assets/steps/step1.webp';
import step2 from '../assets/steps/step2.webp';
import step3 from '../assets/steps/step3.webp';
import step4 from '../assets/steps/step4.webp';
import { Wordmark, LogoMark } from '../components/Logo.jsx';

const GITHUB_URL = 'https://github.com/oceanseth/ChooseYourProtocol';

export default function Landing() {
  useEffect(() => {
    // Progressive enhancement: if the browser lacks scroll-driven animations,
    // reveal steps with IntersectionObserver instead. Respect reduced motion.
    const supportsTimeline = CSS && CSS.supports && CSS.supports('animation-timeline: view()');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (supportsTimeline || reduce) return;
    const track = document.querySelector('.how-track');
    if (track) track.classList.add('js-anim'); // hide first, reveal on scroll
    const steps = document.querySelectorAll('.how-step');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); }),
      { threshold: 0.25 }
    );
    steps.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

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
              <Link className="btn btn-primary btn-lg" to="/login">Get the app</Link>
            </div>
          </div>
          <div className="spotlight-device">
            <img
              className="spotlight-phone"
              src={appPreview}
              alt="StackMax app on iPhone showing a protocol dashboard with a 12-day streak and daily check-ins"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="how-head">
          <span className="landing-eyebrow">How it works</span>
          <h2>Four steps from goal to proof.</h2>
        </div>

        <div className="how-track">
          <div className="how-spine" aria-hidden="true"><span className="how-spine-fill" /></div>

          <article className="how-step">
            <div className="how-copy">
              <span className="how-num">1</span>
              <h3>Tell Max a goal</h3>
              <p>Even a vague one. Max turns "I want good skin" into a real protocol.</p>
            </div>
            <div className="how-shot"><img src={step1} alt="StackMax chat onboarding: Max the AI coach turning a goal into a suggested protocol" loading="lazy" /></div>
          </article>

          <article className="how-step reverse">
            <div className="how-copy">
              <span className="how-num">2</span>
              <h3>Get measured metrics</h3>
              <p>Objective data, not vibes. Max decides what to track and how often.</p>
            </div>
            <div className="how-shot"><img src={step2} alt="StackMax metrics dashboard: pimple count trending down 72% with a daily photo strip" loading="lazy" /></div>
          </article>

          <article className="how-step">
            <div className="how-copy">
              <span className="how-num">3</span>
              <h3>Join a protocol group</h3>
              <p>Real people running the same protocol. Streaks, wins, accountability.</p>
            </div>
            <div className="how-shot"><img src={step3} alt="StackMax community feed: a 248-member Clear Skin Protocol group with streak leaderboard" loading="lazy" /></div>
          </article>

          <article className="how-step reverse">
            <div className="how-copy">
              <span className="how-num">4</span>
              <h3>Prove it</h3>
              <p>Photo, device, or lab — verified, not self-reported. Provable wins.</p>
            </div>
            <div className="how-shot"><img src={step4} alt="StackMax verified win: a before/after with a green Verified badge and shareable win card" loading="lazy" /></div>
          </article>
        </div>
      </section>

      <section className="honest">
        <div className="honest-panel">
          <LogoMark size={34} />
          <h2>We build in the open.</h2>
          <p className="honest-lead">
            StackMax is an <strong>AI-orchestrated community</strong>. Some participants and content are
            AI-generated to help new groups grow — and we always label them.
          </p>
          <p className="honest-fine">
            We don't guarantee the accuracy of any measurement or claim. By using StackMax you agree to our{' '}
            <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
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
