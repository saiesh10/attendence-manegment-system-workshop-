const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.teacher.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      return res.status(201).json({ message: 'Teacher registered successfully' });
    } catch (error) {
      console.error('Register error:', error);
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (error.code === 'P1001' || error.code === 'P1000') {
        return res.status(503).json({ error: 'Database unavailable. Run: npx prisma db push' });
      }
      return res.status(500).json({ error: 'Unable to register teacher' });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const teacher = await prisma.teacher.findUnique({ where: { email } });
      if (!teacher) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, teacher.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: teacher.id, name: teacher.name }, process.env.JWT_SECRET, {
        expiresIn: '8h',
      });

      return res.json({ token, name: teacher.name });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to login' });
    }
  }
);

module.exports = router;
