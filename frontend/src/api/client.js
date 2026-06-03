const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('attendx_token');
}

export function setAuth(token, name) {
  localStorage.setItem('attendx_token', token);
  localStorage.setItem('attendx_name', name);
}

export function clearAuth() {
  localStorage.removeItem('attendx_token');
  localStorage.removeItem('attendx_name');
}

export function getTeacherName() {
  return localStorage.getItem('attendx_name');
}

export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  }).catch(() => {
    throw new Error('Cannot reach server. Start the backend with: npm run dev');
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const errorBody = isJson ? await response.json() : { error: 'Request failed' };
    throw new Error(errorBody.error || 'Something went wrong');
  }

  if (response.status === 204) return null;
  if (!isJson) return response;
  return response.json();
}

export async function downloadFile(path, filename) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {
    throw new Error('Cannot reach server. Start the backend with: npm run dev');
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(errorBody.error || 'Download failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const auth = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const sessions = {
  list: () => apiRequest('/sessions'),
  get: (id) => apiRequest(`/sessions/${id}`),
  create: (subject, section) =>
    apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify({ subject, section: section || undefined }),
    }),
  refreshQr: (id) =>
    apiRequest(`/sessions/${id}/refresh-qr`, { method: 'POST' }),
  close: (id) =>
    apiRequest(`/sessions/${id}/close`, { method: 'PATCH' }),
};

export const attendance = {
  scan: (qrToken, studentRoll, studentName) =>
    apiRequest('/attend/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken, studentRoll, studentName: studentName || undefined }),
    }),
  listBySession: (sessionId) => apiRequest(`/attend/session/${sessionId}`),
};

export const reports = {
  sessions: () => apiRequest('/reports/sessions'),
  exportSubject: (subject) =>
    downloadFile(`/reports/subject/${encodeURIComponent(subject)}`, `attendance_${subject}.xlsx`),
  exportSession: (sessionId) =>
    downloadFile(`/reports/export-session/${sessionId}`, 'session_report.xlsx'),
  exportAll: () => downloadFile('/reports/export-all', 'full_report.xlsx'),
};
