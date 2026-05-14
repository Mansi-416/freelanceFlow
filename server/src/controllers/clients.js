const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const clients = await prisma.client.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json(clients);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { name, company, email, phone, notes, defaultHourlyRate } = req.body;
  const currentCount = await prisma.client.count({ where: { userId: req.user.id } });
  const plan = req.user.plan || 'FREE';

  if (plan === 'FREE' && currentCount >= 2) {
    return res.status(403).json({ error: 'Free plan limit reached. Upgrade to Pro for unlimited clients.' });
  }

  const client = await prisma.client.create({
    data: {
      name,
      company,
      email,
      phone,
      notes,
      defaultHourlyRate: Number(defaultHourlyRate) || 80,
      userId: req.user.id
    }
  });
  res.json(client);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  const data = req.body;
  const client = await prisma.client.updateMany({ where: { id, userId: req.user.id }, data });
  if (client.count === 0) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Client updated' });
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  await prisma.client.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Client removed' });
});

module.exports = router;
