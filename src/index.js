require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRouter = require('./routes/auth');
const sessionsRouter = require('./routes/sessions');
const attendanceRouter = require('./routes/attendance');
const reportsRouter = require('./routes/reports');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.use(cors());
app.use(express.json());
app.set('io', io);

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/attend', attendanceRouter);
app.use('/api/reports', reportsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'AttendX backend is running.' });
});

io.on('connection', (socket) => {
  socket.on('join-session', (sessionId) => {
    if (typeof sessionId === 'string') {
      socket.join(sessionId);
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`AttendX server running on http://localhost:${PORT}`);
});
