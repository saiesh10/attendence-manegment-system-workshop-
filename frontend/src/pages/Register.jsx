import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(form);
      navigate('/login', { state: { registered: true } });
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
          <UserPlus size={24} />
        </div>
        <h1>Create teacher account</h1>
        <p className="auth-subtitle">Sign up to start managing attendance sessions.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              value={form.name}
              onChange={updateField('name')}
              placeholder="Dr. Jane Smith"
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="you@university.edu"
              required
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={updateField('password')}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
