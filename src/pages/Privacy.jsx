import React from 'react';
import { Link } from 'react-router-dom';
import LegalShell from '../components/LegalShell.jsx';

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 13, 2026">
      <p className="legal-lede">
        What we collect, why, and the control you have — including optional demographic data used for
        aggregate insight.
      </p>
      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — how you sign in and identify yourself.</li>
        <li><strong>Protocol &amp; metric data</strong> — goals, protocols, and measurements you log, including photos, device data, or lab values you choose to add.</li>
        <li><strong>Optional demographic data</strong> — age, ethnicity, gender, only if you provide them.</li>
        <li><strong>Usage data</strong> — how you interact with the app, for reliability and improvement.</li>
      </ul>
      <h2>2. Demographic data &amp; disclosure control</h2>
      <p>
        Demographic fields are <strong>optional</strong>. For each you control disclosure: share with no one,
        with your group members, or contribute to <strong>aggregate-only insight</strong>. Aggregate insight is
        designed so your individual row is not exposed to other users.
      </p>
      <h2>3. AI processing</h2>
      <p>
        We use AI to coach, resolve goals into protocols and metrics, generate community content, and compute
        aggregate insights. Your data may be processed by these systems. AI outputs are not guaranteed accurate.
      </p>
      <h2>4. Synthetic participants</h2>
      <p>
        The platform may include AI-generated synthetic participants and content, including AI-generated avatar
        images and video, used to illustrate protocols and seed communities. These are generated content, not
        real individuals, and are labeled where feasible.
      </p>
      <h2>5. Sharing</h2>
      <p>We share data with service providers who help us run the platform (hosting, AI, avatar generation). We do not sell your personal data.</p>
      <h2>6. Your choices</h2>
      <p>You can edit or remove demographic fields, adjust disclosure settings, and request deletion of your account data, subject to legal and operational limits.</p>
      <h2>7. Security</h2>
      <p>We take reasonable measures to protect your data, but no system is perfectly secure.</p>
      <h2>8. Changes</h2>
      <p>We may update this policy and will reflect the update date above.</p>
      <p className="legal-foot">See also our <Link to="/terms">Terms of Use</Link>.</p>
    </LegalShell>
  );
}
