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
- Teacher invite code prevents unauthorized signups.
- Sessions can be manually closed by the teacher.

## Tech Stack
- Backend: Node.js, Express, Socket.io
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT + bcrypt
- QR generation: `qrcode` npm package
- Real-time updates: Socket.io

## Setup Instructions
1. Clone the repo.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a PostgreSQL database named `attendx` in pgAdmin or psql:
   ```sql
   CREATE DATABASE attendx;
   ```
4. Configure `.env` with your database credentials and secrets.
5. Push the Prisma schema to the database:
   ```bash
   npx prisma db push
   ```
6. Run the development server:
   ```bash
   npm run dev
   ```
7. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```
   Open the browser at `http://localhost:5555`.

## API Endpoints
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | None | Teacher signup with invite code |
| POST | /api/auth/login | None | Teacher login, returns JWT |
| POST | /api/sessions | JWT | Create session + get QR |
| POST | /api/sessions/:id/refresh-qr | JWT | Refresh expiring QR |
| GET | /api/sessions | JWT | Get teacher sessions |
| GET | /api/sessions/:id | JWT | Get single session details |
| PATCH | /api/sessions/:id/close | JWT | Close session |
| POST | /api/attend/scan | None | Student marks attendance |
| GET | /api/attend/session/:id | None | Get session attendance list |
| GET | /api/reports/subject/:name | JWT | Attendance % per student |
| GET | /api/reports/sessions | JWT | Session summary report |

## Environment Variables
- `PORT` - Server port (default `5000`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `TEACHER_INVITE_CODE` - Register code for teachers
- `QR_EXPIRY_SECONDS` - QR validity window in seconds
- `EMAIL_USER` - SMTP username for email alerts
- `EMAIL_PASS` - SMTP password for email alerts

## Prisma Studio
Run:
```bash
npx prisma studio
```
Use Prisma Studio to inspect `Teacher`, `Session`, and `Attendance` records.
