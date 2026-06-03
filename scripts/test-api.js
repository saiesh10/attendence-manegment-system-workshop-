/**
 * End-to-end API smoke test for AttendX.
 * Run: node scripts/test-api.js
 * Requires backend on http://localhost:5000
 */

const BASE = 'http://localhost:5000/api';
const TEST_EMAIL = `test-${Date.now()}@attendx.local`;
const TEST_PASSWORD = 'testpass123';

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}: ${detail}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else if (contentType.includes('spreadsheet') || contentType.includes('octet-stream')) {
    body = await res.arrayBuffer();
  } else {
    body = await res.text();
  }

  return { status: res.status, body, headers: res.headers };
}

async function main() {
  console.log('\nAttendX API smoke test\n');

  let token;
  let sessionId;
  let qrToken;

  // Health
  try {
    const health = await fetch('http://localhost:5000/');
    const data = await health.json();
    if (health.ok && data.message) pass('Backend health check');
    else fail('Backend health check', 'Unexpected response');
  } catch (e) {
    fail('Backend health check', e.message);
    console.log('\nStart backend first: npm run dev\n');
    process.exit(1);
  }

  // Register
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Teacher', email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (reg.status === 201) pass('Teacher registration');
  else fail('Teacher registration', reg.body?.error || reg.status);

  // Login
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (login.status === 200 && login.body.token) {
    pass('Teacher login');
    token = login.body.token;
  } else fail('Teacher login', login.body?.error || login.status);

  const auth = { Authorization: `Bearer ${token}` };

  // Create session
  const create = await request('/sessions', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ subject: 'Test Subject', section: 'A' }),
  });
  if (create.status === 201 && create.body.sessionId && create.body.qrImage) {
    pass('Create session + QR');
    sessionId = create.body.sessionId;
    qrToken = create.body.qrToken;
  } else fail('Create session + QR', create.body?.error || create.status);

  // List sessions
  const list = await request('/sessions', { headers: auth });
  if (list.status === 200 && Array.isArray(list.body) && list.body.length > 0) {
    pass('List sessions');
  } else fail('List sessions', list.body?.error || list.status);

  // Get session
  const get = await request(`/sessions/${sessionId}`, { headers: auth });
  if (get.status === 200 && get.body.id === sessionId) pass('Get session details');
  else fail('Get session details', get.body?.error || get.status);

  // Refresh QR
  const refresh = await request(`/sessions/${sessionId}/refresh-qr`, {
    method: 'POST',
    headers: auth,
  });
  if (refresh.status === 200 && refresh.body.qrImage) {
    pass('Refresh QR');
    qrToken = refresh.body.qrToken;
  } else fail('Refresh QR', refresh.body?.error || refresh.status);

  // Student scan
  const scan = await request('/attend/scan', {
    method: 'POST',
    body: JSON.stringify({ qrToken, studentRoll: '21CS001', studentName: 'Alice' }),
  });
  if (scan.status === 200 && scan.body.success) pass('Student attendance scan');
  else fail('Student attendance scan', scan.body?.error || scan.status);

  // Duplicate scan
  const dup = await request('/attend/scan', {
    method: 'POST',
    body: JSON.stringify({ qrToken, studentRoll: '21CS001' }),
  });
  if (dup.status === 409) pass('Duplicate scan rejected');
  else fail('Duplicate scan rejected', `Expected 409, got ${dup.status}`);

  // Public attendance list
  const attendList = await request(`/attend/session/${sessionId}`);
  if (attendList.status === 200 && attendList.body.length === 1) pass('Public attendance list');
  else fail('Public attendance list', attendList.body?.error || attendList.status);

  // Reports sessions
  const reportSessions = await request('/reports/sessions', { headers: auth });
  if (reportSessions.status === 200 && Array.isArray(reportSessions.body)) {
    pass('Reports session summary');
  } else fail('Reports session summary', reportSessions.body?.error || reportSessions.status);

  // Export session
  const exportSession = await request(`/reports/export-session/${sessionId}`, { headers: auth });
  if (exportSession.status === 200 && exportSession.body.byteLength > 100) {
    pass('Export session Excel');
  } else fail('Export session Excel', exportSession.status);

  // Export subject
  const exportSubject = await request('/reports/subject/Test%20Subject', { headers: auth });
  if (exportSubject.status === 200 && exportSubject.body.byteLength > 100) {
    pass('Export subject Excel');
  } else fail('Export subject Excel', exportSubject.status);

  // Export all
  const exportAll = await request('/reports/export-all', { headers: auth });
  if (exportAll.status === 200 && exportAll.body.byteLength > 100) {
    pass('Export all Excel');
  } else fail('Export all Excel', exportAll.status);

  // Close session
  const close = await request(`/sessions/${sessionId}/close`, {
    method: 'PATCH',
    headers: auth,
  });
  if (close.status === 200) pass('Close session');
  else fail('Close session', close.body?.error || close.status);

  // Scan on closed session
  const closedScan = await request('/attend/scan', {
    method: 'POST',
    body: JSON.stringify({ qrToken, studentRoll: '21CS002' }),
  });
  if (closedScan.status === 400) pass('Closed session scan rejected');
  else fail('Closed session scan rejected', `Expected 400, got ${closedScan.status}`);

  // WebSocket (Socket.io polling handshake)
  try {
    const wsCheck = await fetch('http://localhost:5000/socket.io/?EIO=4&transport=polling');
    if (wsCheck.ok) pass('WebSocket (Socket.io) available');
    else fail('WebSocket (Socket.io) available', `Status ${wsCheck.status}`);
  } catch (e) {
    fail('WebSocket (Socket.io) available', e.message);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
