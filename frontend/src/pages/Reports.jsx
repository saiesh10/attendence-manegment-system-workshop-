import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import Layout from '../components/Layout';
import { EmptyState, PageHeader } from '../components/Navbar';
import { reports } from '../api/client';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Reports() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await reports.sessions();
        setSessions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const subjects = useMemo(
    () => [...new Set(sessions.map((s) => s.subject))].sort(),
    [sessions]
  );

  async function handleExport(type, subject) {
    const key = subject ? `${type}-${subject}` : type;
    setExporting(key);
    setError('');
    try {
      if (type === 'all') {
        await reports.exportAll();
      } else if (type === 'subject') {
        await reports.exportSubject(subject);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(null);
    }
  }

  const totalCheckIns = sessions.reduce((sum, s) => sum + s.attendanceCount, 0);

  return (
    <Layout>
      <div className="container">
        <PageHeader
          eyebrow="Analytics"
          title="Reports & exports"
          description="Download Excel reports for your subjects and sessions."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleExport('all')}
              disabled={sessions.length === 0 || exporting === 'all'}
            >
              <Download size={18} />
              {exporting === 'all' ? 'Exporting…' : 'Export all subjects'}
            </button>
          }
        />

        {error && <div className="alert alert-error">{error}</div>}

        <div className="stats-row stats-row--compact">
          <div className="metric-card">
            <div className="metric-icon metric-icon--violet">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span className="metric-label">Subjects</span>
              <strong className="metric-value">{subjects.length}</strong>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon--teal">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span className="metric-label">Sessions</span>
              <strong className="metric-value">{sessions.length}</strong>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon--amber">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span className="metric-label">Total check-ins</span>
              <strong className="metric-value">{totalCheckIns}</strong>
            </div>
          </div>
        </div>

        {subjects.length > 0 && (
          <section className="reports-section">
            <h2>Export by subject</h2>
            <div className="subject-export-grid">
              {subjects.map((subject) => (
                <div key={subject} className="subject-export-card">
                  <div>
                    <strong>{subject}</strong>
                    <span>
                      {sessions.filter((s) => s.subject === subject).length} sessions
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleExport('subject', subject)}
                    disabled={exporting === `subject-${subject}`}
                  >
                    <Download size={16} />
                    {exporting === `subject-${subject}` ? '…' : 'Excel'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="loading-state">Loading reports…</div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No report data yet"
            description="Create and run attendance sessions to generate exportable reports."
          />
        ) : (
          <section className="reports-section">
            <h2>Session history</h2>
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Date</th>
                    <th>Present</th>
                    <th>Status</th>
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
                          {session.closed ? 'Closed' : 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
