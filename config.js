const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.SECURE_NOTES_API_BASE_URL = isLocal
  ? 'http://localhost:3000/api'
  : 'https://secure-notes-backend-delta.vercel.app/api';
