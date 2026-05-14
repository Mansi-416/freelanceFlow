const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const entries = await prisma.timeEntry.findMany({
    where: { userId: req.user.id },
    include: { project: true, task: true },
    orderBy: { date: 'desc' }
  });
  res.json(entries);
});

router.get('/project/:projectId', async (req, res) => {
  const prisma = req.app.get('prisma');
  const projectId = Number(req.params.projectId);
  const entries = await prisma.timeEntry.findMany({
    where: { projectId, userId: req.user.id },
    orderBy: { date: 'desc' }
  });
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
  const burnRate = project ? (totalMinutes / 60) * project.hourlyRate : 0;
  res.json({ entries, totalHours: Math.round(totalMinutes / 60 * 100) / 100, burnRate: Math.round(burnRate * 100) / 100 });
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { description, startTime, endTime, date, projectId, taskId } = req.body;
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMinutes = Math.round((end - start) / 60000);
  const entry = await prisma.timeEntry.create({
    data: {
      description,
      startTime: start,
      endTime: end,
      durationMinutes: Math.max(durationMinutes, 0),
      date: date ? new Date(date) : new Date(),
      projectId: Number(projectId),
      taskId: taskId ? Number(taskId) : null,
      userId: req.user.id
    }
  });
  res.json(entry);
});

router.patch('/:id/toggle-billable', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  const entry = await prisma.timeEntry.findFirst({ where: { id, userId: req.user.id } });
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  const updated = await prisma.timeEntry.update({ where: { id }, data: { billable: !entry.billable } });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  await prisma.timeEntry.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Entry removed' });
});

module.exports = router;
