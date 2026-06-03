const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, param } = require('express-validator');
const prisma = require('../prisma');
const authenticateTeacher = require('../middleware/auth');

const router = express.Router();
const qrExpirySeconds = Number(process.env.QR_EXPIRY_SECONDS || 60);
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

router.use(authenticateTeacher);

router.post(
  '/',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('section').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { subject, section } = req.body;
    const qrToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + qrExpirySeconds * 1000);
    const scanUrl = `${frontendUrl}/scan/${qrToken}`;

    try {
      const session = await prisma.session.create({
        data: {
          teacherId: req.teacher.id,
          subject,
          section,
          qrToken,
          tokenExpiresAt,
        },
      });

      const qrImage = await QRCode.toDataURL(scanUrl);

      return res.status(201).json({
        sessionId: session.id,
        qrToken,
        qrImage,
        expiresAt: tokenExpiresAt,
        scanUrl,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to create session' });
    }
  }
);

router.post(
  '/:id/refresh-qr',
  [param('id').isUUID().withMessage('Valid session ID is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { id } = req.params;
    const qrToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + qrExpirySeconds * 1000);
    const scanUrl = `${frontendUrl}/scan/${qrToken}`;

    try {
      const session = await prisma.session.findUnique({ where: { id } });
      if (!session || session.teacherId !== req.teacher.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const updatedSession = await prisma.session.update({
        where: { id },
        data: { qrToken, tokenExpiresAt },
      });

      const qrImage = await QRCode.toDataURL(scanUrl);

      return res.json({
        qrToken,
        qrImage,
        expiresAt: updatedSession.tokenExpiresAt,
        scanUrl,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to refresh QR code' });
    }
  }
);

router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { teacherId: req.teacher.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { attendance: true } } },
    });

    return res.json(
      sessions.map((session) => ({
        id: session.id,
        subject: session.subject,
        section: session.section,
        qrToken: session.qrToken,
        tokenExpiresAt: session.tokenExpiresAt,
        createdAt: session.createdAt,
        closed: session.closed,
        attendanceCount: session._count.attendance,
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch sessions' });
  }
});

router.get('/:id', [param('id').isUUID().withMessage('Valid session ID is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { attendance: { orderBy: { scannedAt: 'asc' } } },
    });

    if (!session || session.teacherId !== req.teacher.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({
      id: session.id,
      subject: session.subject,
      section: session.section,
      qrToken: session.qrToken,
      tokenExpiresAt: session.tokenExpiresAt,
      createdAt: session.createdAt,
      closed: session.closed,
      attendance: session.attendance,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch session details' });
  }
});

router.patch('/:id/close', [param('id').isUUID().withMessage('Valid session ID is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session || session.teacherId !== req.teacher.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.session.update({ where: { id: req.params.id }, data: { closed: true } });

    return res.json({ message: 'Session closed' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to close session' });
  }
});

module.exports = router;
