# AttendX — Smart Classroom Attendance System

## Problem
Teachers waste valuable class time taking manual attendance, and students are left waiting while attendance is recorded.

## Solution
AttendX streamlines attendance with a QR-based workflow:
- Teacher creates a live attendance session with a time-expiring QR code.
- Students scan the QR and submit their roll number.
- Attendance is recorded instantly in the database.
- Teachers receive live updates on attendance via WebSocket.

## Anti-Cheat Features
- QR token expires every 60 seconds by default.
- One attendance entry per student per session via database unique constraint.
- Sessions can be manually closed by the teacher.

## Tech Stack
- **Frontend:** React, Vite, React Router, Socket.io Client
- **Backend:** Node.js, Express, Socket.io
- **Database:** SQLite (local dev) or PostgreSQL + Prisma ORM
- **Authentication:** JWT + bcrypt
- **QR generation:** `qrcode` npm package
- **Excel export:** `exceljs` npm package
- **Real-time updates:** Socket.io

## Setup Instructions

### Backend
1. Clone the repo.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the database (SQLite is used by default — no extra setup needed):
   ```bash
   npx prisma db push
   ```
   For PostgreSQL instead, set `DATABASE_URL` in `.env` and create the database first.
4. Configure `.env` (JWT secret, optional email settings).
5. Run the backend server:
   ```bash
   npm run dev
   ```
   API runs at `http://localhost:5000`.

### Frontend
1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   Open the app at `http://localhost:3000`.

The Vite dev server proxies `/api` and WebSocket traffic to the backend on port 5000.

### Prisma Studio

## API Endpoints
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | None | Teacher signup |
| POST | /api/auth/login | None | Teacher login, returns JWT |
| POST | /api/sessions | JWT | Create session + get QR |
| POST | /api/sessions/:id/refresh-qr | JWT | Refresh expiring QR |
| GET | /api/sessions | JWT | Get teacher sessions |
| GET | /api/sessions/:id | JWT | Get single session details |
| PATCH | /api/sessions/:id/close | JWT | Close session |
| POST | /api/attend/scan | None | Student marks attendance |
| GET | /api/attend/session/:id | None | Get session attendance list |
| GET | /api/reports/subject/:name | JWT | Export attendance for a subject to Excel |
| GET | /api/reports/sessions | JWT | Session summary report |
| GET | /api/reports/export-session/:sessionId | JWT | Export a single session to Excel |
| GET | /api/reports/export-all | JWT | Export all subjects for teacher to Excel |

## Environment Variables
- `PORT` - Server port (default `5000`)
- `DATABASE_URL` - SQLite path (default `file:./dev.db`) or PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `FRONTEND_URL` - Frontend URL for QR scan links (default `http://localhost:3000`)
- `QR_EXPIRY_SECONDS` - QR validity window in seconds
- `EMAIL_USER` - SMTP username for email alerts
- `EMAIL_PASS` - SMTP password for email alerts

Run:
```bash
npx prisma studio
```
Open the browser at `http://localhost:5555`.

## Frontend Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login`, `/register` | Teacher authentication |
| `/dashboard` | Session list and create new sessions |
| `/session/:id` | Live QR display, attendance feed, export |
| `/scan/:qrToken` | Student attendance check-in |
| `/reports` | Session history and Excel exports |
