import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, QrCode, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ variant = 'app' }) {
  const { isAuthenticated, name, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  if (variant === 'landing') {
    return (
      <header className="navbar navbar--landing">
        <Link to="/" className="brand">
          <span className="brand-mark">AX</span>
          <span className="brand-text">AttendX</span>
        </Link>
        <nav className="nav-actions">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost btn-sm">
                Dashboard
              </Link>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>
    );
  }

  return (
    <header className="navbar navbar--app">
      <Link to="/dashboard" className="brand">
        <span className="brand-mark">AX</span>
        <span className="brand-text">AttendX</span>
      </Link>

      <nav className="nav-tabs">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          Sessions
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          Reports
        </NavLink>
      </nav>

      <div className="nav-user">
        <span className="nav-user-name">{name}</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={handleLogout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = QrCode, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
