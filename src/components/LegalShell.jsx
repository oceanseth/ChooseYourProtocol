import React from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './Logo.jsx';

// Public standalone shell for legal pages — reachable signed-out, same pattern as About.
export default function LegalShell({ title, updated, children }) {
  return (
    <div className="legal-page">
      <div className="legal-bar">
        <Link to="/" className="brand"><LogoMark size={20} /> ChooseYourProtocol</Link>
        <nav className="legal-nav">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/about">About</Link>
        </nav>
      </div>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated: {updated}</p>
      <div className="legal-body">{children}</div>
      <div className="legal-disclaimer">
        Provided for transparency; not legal advice. To be reviewed by qualified counsel before public launch.
      </div>
    </div>
  );
}
