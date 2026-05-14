const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const tasks = await prisma.task.findMany({
    where: { userId: req.user.id },
    include: { project: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tasks);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { title, description, status, dueDate, projectId } = req.body;
  const task = await prisma.task.create({ data: { title, description, status, dueDate: dueDate ? new Date(dueDate) : null, projectId: Number(projectId), userId: req.user.id } });
  res.json(task);
});

router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  const data = req.body;
  if (data.projectId) data.projectId = Number(data.projectId);
  if (data.dueDate === '') data.dueDate = null;
  const updated = await prisma.task.updateMany({ where: { id, userId: req.user.id }, data });
  if (updated.count === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task updated' });
});

router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  await prisma.task.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Task removed' });
});

module.exports = router;
