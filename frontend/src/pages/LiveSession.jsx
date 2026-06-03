import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  StopCircle,
  Timer,
  Users,
} from 'lucide-react';
import Layout from '../components/Layout';
import { reports, sessions as sessionsApi } from '../api/client';

function useCountdown(expiresAt) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!expiresAt) return undefined;

    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(diff / 1000)));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LiveSession() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const autoRefreshRef = useRef(false);
  const remaining = useCountdown(expiresAt);

  const loadSession = useCallback(async () => {
    setError('');
    try {
      const data = await sessionsApi.get(id);
      setSession(data);
      setExpiresAt(data.tokenExpiresAt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refreshQr = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const data = await sessionsApi.refreshQr(id);
      setQrImage(data.qrImage);
      setExpiresAt(data.expiresAt);
      autoRefreshRef.current = false;
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!session || session.closed) return undefined;

    const socket = io({ path: '/socket.io' });
    socket.emit('join-session', id);

    socket.on('attendance-update', (update) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exists = prev.attendance.some((a) => a.studentRoll === update.studentRoll);
        if (exists) return prev;
        return {
          ...prev,
          attendance: [
            ...prev.attendance,
            {
              id: `${update.studentRoll}-${Date.now()}`,
              studentRoll: update.studentRoll,
              studentName: update.studentName,
              scannedAt: new Date().toISOString(),
            },
          ],
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [id, session?.closed]);

  useEffect(() => {
    if (!session || session.closed || qrImage) return;
    refreshQr();
  }, [session, qrImage, refreshQr]);

  useEffect(() => {
    if (remaining === 0 && session && !session.closed && qrImage && !refreshing && !autoRefreshRef.current) {
      autoRefreshRef.current = true;
      refreshQr();
    }
    if (remaining > 0) {
      autoRefreshRef.current = false;
    }
  }, [remaining, session, qrImage, refreshing, refreshQr]);

  async function handleClose() {
    if (!window.confirm('Close this session? Students will no longer be able to scan.')) return;
    setClosing(true);
    try {
      await sessionsApi.close(id);
      await loadSession();
    } catch (err) {
      setError(err.message);
    } finally {
      setClosing(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await reports.exportSession(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container">
          <div className="loading-state">Loading session…</div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="container">
          <div className="alert alert-error">{error || 'Session not found'}</div>
          <Link to="/dashboard" className="btn btn-ghost">
            <ArrowLeft size={18} />
            Back to dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={16} />
          All sessions
        </Link>

        <div className="live-header">
          <div>
            <p className="eyebrow">{session.section || 'No section'}</p>
            <h1>{session.subject}</h1>
            <span className={`status-pill ${session.closed ? 'closed' : 'open'}`}>
              {session.closed ? 'Closed' : 'Live'}
            </span>
          </div>
          <div className="live-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={exporting || session.attendance.length === 0}
            >
              <Download size={18} />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            {!session.closed && (
              <button type="button" className="btn btn-danger" onClick={handleClose} disabled={closing}>
                <StopCircle size={18} />
                {closing ? 'Closing…' : 'Close session'}
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="live-grid">
          <div className="qr-panel">
            {session.closed ? (
              <div className="qr-closed">
                <StopCircle size={48} />
                <p>This session is closed</p>
              </div>
            ) : (
              <>
                <div className="qr-frame">
                  {qrImage ? (
                    <img src={qrImage} alt="Attendance QR code" className="qr-image" />
                  ) : (
                    <div className="qr-placeholder">Generating QR…</div>
                  )}
                </div>
                <div className="qr-meta">
                  <div className={`timer-badge ${remaining <= 10 ? 'urgent' : ''}`}>
                    <Timer size={16} />
                    Refreshes in {formatTime(remaining)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={refreshQr}
                    disabled={refreshing}
                  >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing…' : 'Refresh QR now'}
                  </button>
                </div>
                <p className="qr-hint">Project this code for students to scan with their phones.</p>
              </>
            )}
          </div>

          <div className="attendance-panel">
            <div className="attendance-panel-header">
              <Users size={20} />
              <h2>Present students</h2>
              <span className="count-badge count-badge--large">{session.attendance.length}</span>
            </div>

            {session.attendance.length === 0 ? (
              <div className="attendance-empty">
                <p>Waiting for the first scan…</p>
              </div>
            ) : (
              <ul className="attendance-list">
                {session.attendance.map((record, index) => (
                  <li key={record.id} className="attendance-item">
                    <span className="attendance-rank">{index + 1}</span>
                    <div>
                      <strong>{record.studentRoll}</strong>
                      {record.studentName && <span>{record.studentName}</span>}
                    </div>
                    <time>
                      {new Date(record.scannedAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
