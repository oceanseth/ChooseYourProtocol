import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LogoMark } from './components/Logo.jsx';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Activity from './pages/Activity.jsx';
import Collection from './pages/Collection.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import Admin from './pages/Admin.jsx';
import About from './pages/About.jsx';
import Landing from './pages/Landing.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';

function Splash({ text = 'Loading…' }) {
  return (
    <div className="splash">
      <div className="splash-logo"><LogoMark size={26} /> ChooseYourProtocol</div>
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const { user, member, loading, error } = useAuth();
  const location = useLocation();

  // Public pages — reachable whether or not you're signed in.
  if (location.pathname === '/about') return <About />;
  if (location.pathname === '/terms') return <Terms />;
  if (location.pathname === '/privacy') return <Privacy />;

  if (loading) return <Splash text="Setting up your protocol…" />;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  if (error) {
    return <Splash text={`Account setup error: ${error}`} />;
  }

  // Gate: a member with no personal goals must complete onboarding first.
  const hasGoals = member && Array.isArray(member.personalGoals) && member.personalGoals.length > 0;
  if (!hasGoals && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
