import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, QrCode, UserCheck } from 'lucide-react';
import { attendance } from '../api/client';

export default function ScanAttendance() {
  const { qrToken } = useParams();
  const [studentRoll, setStudentRoll] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await attendance.scan(qrToken, studentRoll.trim(), studentName.trim());
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="scan-page">
        <div className="scan-bg" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className="scan-card scan-card--success">
          <div className="success-icon">
            <CheckCircle2 size={56} />
          </div>
          <h1>You&apos;re marked present!</h1>
          <p className="scan-subject">{success.subject}</p>
          <p className="scan-message">{success.message}</p>
          <p className="scan-note">You may close this page now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-page">
      <div className="scan-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="scan-card">
        <Link to="/" className="brand auth-brand">
          <span className="brand-mark">AX</span>
          <span className="brand-text">AttendX</span>
        </Link>

        <div className="scan-icon">
          <QrCode size={28} />
        </div>
        <h1>Mark your attendance</h1>
        <p className="scan-subtitle">Enter your roll number to check in for today&apos;s class.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Roll number</span>
            <input
              type="text"
              value={studentRoll}
              onChange={(e) => setStudentRoll(e.target.value.toUpperCase())}
              placeholder="e.g. 21CS001"
              required
              autoFocus
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Name <span className="optional">(optional)</span></span>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            <UserCheck size={20} />
            {loading ? 'Submitting…' : 'Submit attendance'}
          </button>
        </form>
      </div>
    </div>
  );
}
