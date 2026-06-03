import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Plus, QrCode, Users } from 'lucide-react';
import Layout from '../components/Layout';
import { EmptyState, PageHeader } from '../components/Navbar';
import { sessions as sessionsApi } from '../api/client';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function CreateSessionModal({ open, onClose, onCreated }) {
  const [subject, setSubject] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject('');
      setSection('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await sessionsApi.create(subject.trim(), section.trim());
      onCreated(result.sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Start new session</h2>
        <p className="modal-subtitle">Students will scan the QR code to mark attendance.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Data Structures"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Section <span className="optional">(optional)</span></span>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. CSE-A"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create & show QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  async function loadSessions() {
    setLoading(true);
    setError('');
    try {
      const data = await sessionsApi.list();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const openSessions = sessions.filter((s) => !s.closed);
  const totalPresent = sessions.reduce((sum, s) => sum + s.attendanceCount, 0);

  return (
    <Layout>
      <div className="container">
        <PageHeader
          eyebrow="Teacher dashboard"
          title="Your sessions"
          description="Create a live QR session and track attendance in real time."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={18} />
              New session
            </button>
          }
        />

        <div className="stats-row">
          <div className="metric-card">
            <div className="metric-icon metric-icon--teal">
              <QrCode size={20} />
            </div>
            <div>
              <span className="metric-label">Active sessions</span>
              <strong className="metric-value">{openSessions.length}</strong>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon--violet">
              <Calendar size={20} />
            </div>
            <div>
              <span className="metric-label">Total sessions</span>
              <strong className="metric-value">{sessions.length}</strong>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon--amber">
              <Users size={20} />
            </div>
            <div>
              <span className="metric-label">Total check-ins</span>
              <strong className="metric-value">{totalPresent}</strong>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-state">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Start your first attendance session and display a QR code for students to scan."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                <Plus size={18} />
                Create session
              </button>
            }
          />
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Created</th>
                  <th>Present</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>{session.subject}</strong>
                    </td>
                    <td>{session.section || '—'}</td>
                    <td>{formatDate(session.createdAt)}</td>
                    <td>
                      <span className="count-badge">{session.attendanceCount}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${session.closed ? 'closed' : 'open'}`}>
                        {session.closed ? 'Closed' : 'Live'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/session/${session.id}`} className="btn btn-ghost btn-sm">
                        {session.closed ? 'View' : 'Open live'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(sessionId) => {
          setModalOpen(false);
          navigate(`/session/${sessionId}`);
        }}
      />
    </Layout>
  );
}
