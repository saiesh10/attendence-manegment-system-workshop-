import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const redirectTo = location.state?.from || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="auth-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">AX</span>
          <span className="brand-text">AttendX</span>
        </Link>

        <div className="auth-icon">
          <LogIn size={24} />
        </div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to manage your attendance sessions.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {location.state?.registered && (
            <div className="alert alert-success">Account created. Sign in to continue.</div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          New teacher? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
