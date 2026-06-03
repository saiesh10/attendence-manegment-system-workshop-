const express = require('express');
const { body, validationResult, param } = require('express-validator');
const prisma = require('../prisma');

const router = express.Router();

router.post(
  '/scan',
  [
    body('qrToken').trim().notEmpty().withMessage('QR token is required'),
    body('studentRoll').trim().notEmpty().withMessage('Student roll number is required'),
    body('studentName').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { qrToken, studentRoll, studentName } = req.body;

    try {
      const session = await prisma.session.findUnique({ where: { qrToken } });
      if (!session) {
        return res.status(404).json({ error: 'Invalid QR code' });
      }

      if (session.closed) {
        return res.status(400).json({ error: 'Session is closed' });
      }

      if (new Date(session.tokenExpiresAt) < new Date()) {
        return res.status(400).json({ error: 'QR code expired. Ask teacher to refresh.' });
      }

      const attendanceRecord = await prisma.attendance.create({
        data: {
          sessionId: session.id,
          studentRoll: studentRoll.trim().toUpperCase(),
          studentName: studentName ? studentName.trim() : null,
        },
      });

      const count = await prisma.attendance.count({ where: { sessionId: session.id } });
      const io = req.app.get('io');
      if (io) {
        io.to(session.id).emit('attendance-update', {
          studentRoll: attendanceRecord.studentRoll,
          studentName: attendanceRecord.studentName,
          count,
        });
      }

      return res.json({
        success: true,
        subject: session.subject,
        message: 'Attendance marked successfully!',
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Attendance already marked' });
      }
      return res.status(500).json({ error: 'Unable to record attendance' });
    }
  }
);

router.get('/session/:id', [param('id').isUUID().withMessage('Valid session ID is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const attendance = await prisma.attendance.findMany({
      where: { sessionId: req.params.id },
      orderBy: { scannedAt: 'asc' },
    });

    return res.json(attendance);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch attendance list' });
  }
});

module.exports = router;
