import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  QrCode,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: QrCode,
    title: 'Live QR Sessions',
    description: 'Generate rotating QR codes that expire every minute to keep attendance secure.',
  },
  {
    icon: Zap,
    title: 'Real-time Updates',
    description: 'Watch students check in live on your dashboard as scans come in.',
  },
  {
    icon: Shield,
    title: 'Anti-cheat Built In',
    description: 'One scan per student, expiring tokens, and teacher-only session control.',
  },
  {
    icon: Clock,
    title: 'Export in Seconds',
    description: 'Download Excel reports by session, subject, or your full teaching history.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-overlay" />
      </div>

      <Navbar variant="landing" />

      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          Smart classroom attendance
        </div>
        <h1 className="hero-title">
          Attendance that moves at the
          <em> speed of class</em>
        </h1>
        <p className="hero-subtitle">
          AttendX replaces roll call with secure QR sessions. Teachers start a live session,
          students scan and submit their roll number — done in seconds.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary btn-lg">
            Start as teacher
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign in
          </Link>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <Users size={20} />
            <div>
              <strong>Instant check-in</strong>
              <span>Students scan &amp; submit roll no.</span>
            </div>
          </div>
          <div className="stat-card">
            <Clock size={20} />
            <div>
              <strong>60s QR refresh</strong>
              <span>Tokens rotate automatically</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-intro">
          <p className="eyebrow">Why AttendX</p>
          <h2>Everything you need for frictionless attendance</h2>
        </div>
        <div className="features-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card">
          <div>
            <p className="eyebrow">For students</p>
            <h2>Scan the QR shown in class</h2>
            <p>Open the link from your teacher&apos;s QR code, enter your roll number, and you&apos;re marked present.</p>
          </div>
          <div className="cta-visual">
            <QrCode size={64} strokeWidth={1.25} />
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>AttendX</span>
        <span>Smart Classroom Attendance</span>
      </footer>
    </div>
  );
}
