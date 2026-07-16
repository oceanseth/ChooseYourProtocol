import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo.jsx';

const FILM_URL = '/media/about-film.mp4';
const FILM_POSTER = '/media/about-film-poster.jpg';

export default function About() {
  return (
    <div className="about-page">
      <header className="about-bar">
        <Link to="/" className="brand"><LogoMark size={20} /> <span>ChooseYourProtocol</span></Link>
        <div className="row-gap">
          <Link className="btn btn-primary" to="/">Enter app</Link>
        </div>
      </header>

      <section className="about-hero">
        <h1>Your body isn't average.</h1>
        <p className="tagline">Health advice is built on population averages. StackMax builds protocols on people like you.</p>
      </section>

      <video
        className="about-video"
        src={FILM_URL}
        poster={FILM_POSTER}
        controls
        playsInline
        preload="metadata"
      />

      <section className="about-cols">
        <div className="about-col">
          <h3>The label says “5% get dizzy.” Whose 5%?</h3>
          <p>Every drug label and study reports an average. But averages hide the answer you actually need. Maybe zero women under forty experienced that side effect — the trial just never said so. When many people share real progress data and biometrics, “may cause dizziness” can finally become <em>“no reported side effects in your demographic.”</em></p>
        </div>
        <div className="about-col">
          <h3>Discoveries no one thought to study</h3>
          <p>Does creatine work differently for men and women? Which skincare routine survives a chlorinated pool? When a group runs the same protocol with photo-proofed check-ins, unknown interactions surface on their own — like swimmers discovering chlorine was undoing their skincare, and a new <em>rinse + moisturize after swim</em> protocol reaching every swimmer the same day.</p>
        </div>
      </section>

      <section className="about-loop">
        <h2>The loop</h2>
        <div className="loop-steps">
          <span>🎯 Tell Max a fuzzy goal</span>
          <span>📋 Max makes it a measurable protocol</span>
          <span>👥 Join a study-backed protocol group</span>
          <span>📸 Share proof and progress over time</span>
          <span>🧠 Community data reveals what works for whom</span>
          <span>🧬 Your protocol adapts to your life and biomarkers</span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Data is shared by choice and anonymized in aggregate — and synthetic members are always labeled.
        </p>
      </section>

      <section className="about-cta">
        <Link className="btn btn-primary btn-lg" to="/">Start your first protocol →</Link>
      </section>
    </div>
  );
}
