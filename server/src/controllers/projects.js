const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const projects = await prisma.project.findMany({
    where: { userId: req.user.id },
    include: { client: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(projects);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { title, description, status, hourlyRate, budget, clientId } = req.body;
  const client = await prisma.client.findFirst({ where: { id: Number(clientId), userId: req.user.id } });
  const rate = hourlyRate ? Number(hourlyRate) : client?.defaultHourlyRate || 80;
  const project = await prisma.project.create({
    data: {
      title,
      description,
      status,
      hourlyRate: rate,
      budget: Number(budget) || 0,
      clientId: Number(clientId),
      userId: req.user.id
    }
  });
  res.json(project);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  const data = req.body;
  if (data.clientId) data.clientId = Number(data.clientId);
  if (data.hourlyRate) data.hourlyRate = Number(data.hourlyRate);
  if (data.budget !== undefined) data.budget = Number(data.budget);
  const updated = await prisma.project.updateMany({ where: { id, userId: req.user.id }, data });
  if (updated.count === 0) return res.status(404).json({ error: 'Project not found' });
  res.json({ message: 'Project updated' });
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  await prisma.project.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Project removed' });
});

module.exports = router;
