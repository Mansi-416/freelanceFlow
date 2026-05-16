const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createToken } = require('./utils');
const { verifyToken } = require('./middleware');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed, plan: 'FREE' } });
    const token = createToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = createToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.patch('/plan', verifyToken, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'PRO'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const updated = await prisma.user.updateMany({ where: { id: req.user.id }, data: { plan } });
    if (updated.count === 0) return res.status(404).json({ error: 'User not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const token = createToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email, plan: user.plan }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
