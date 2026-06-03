const express = require('express');
const { param, validationResult } = require('express-validator');
const prisma = require('../prisma');
const authenticateTeacher = require('../middleware/auth');

const router = express.Router();

router.use(authenticateTeacher);

router.get('/subject/:subject', [param('subject').trim().notEmpty().withMessage('Subject is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const subject = req.params.subject;

  try {
    const sessions = await prisma.session.findMany({
      where: {
        teacherId: req.teacher.id,
        subject,
      },
    });

    if (!sessions.length) {
      return res.json([]);
    }

    const sessionIds = sessions.map((session) => session.id);
    const totalSessions = sessionIds.length;

    const attendanceGroups = await prisma.attendance.groupBy({
      by: ['studentRoll', 'studentName'],
      where: { sessionId: { in: sessionIds } },
      _count: { sessionId: true },
    });

    const report = attendanceGroups
      .map((item) => ({
        studentRoll: item.studentRoll,
        studentName: item.studentName,
        attended: item._count.sessionId,
        totalSessions,
        percentage: Number(((item._count.sessionId / totalSessions) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.percentage - a.percentage || a.studentRoll.localeCompare(b.studentRoll));

    return res.json(report);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch subject report' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { teacherId: req.teacher.id },
      include: { _count: { select: { attendance: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = sessions.map((session) => ({
      id: session.id,
      subject: session.subject,
      section: session.section,
      createdAt: session.createdAt,
      closed: session.closed,
      attendanceCount: session._count.attendance,
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch session reports' });
  }
});

module.exports = router;
