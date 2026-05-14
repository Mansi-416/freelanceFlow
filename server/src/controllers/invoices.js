const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.user.id },
    include: { client: true, project: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(invoices);
});

router.get('/unbilled', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { clientId, projectId, from, to } = req.query;
  const filters = {
    userId: req.user.id,
    billed: false,
  };

  if (clientId) {
    filters.project = { clientId: Number(clientId) };
  }
  if (projectId) {
    filters.projectId = Number(projectId);
  }
  if (from || to) {
    filters.date = {};
    if (from) filters.date.gte = new Date(from);
    if (to) filters.date.lte = new Date(to);
  }

  const entries = await prisma.timeEntry.findMany({
    where: filters,
    include: { project: true, task: true }
  });
  res.json(entries);
});

router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { number, dueDate, clientId, projectId, timeEntryIds, notes } = req.body;
  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: timeEntryIds || [] }, userId: req.user.id, billed: false },
    include: { project: true }
  });
  const total = entries.reduce((sum, entry) => sum + ((entry.durationMinutes / 60) * (entry.project?.hourlyRate || 0)), 0);
  const invoice = await prisma.invoice.create({
    data: {
      number,
      dueDate: dueDate ? new Date(dueDate) : null,
      clientId: Number(clientId),
      projectId: Number(projectId),
      total: Number(total) || 0,
      notes,
      userId: req.user.id,
      timeEntries: {
        connect: entries.map((entry) => ({ id: entry.id }))
      }
    },
    include: { timeEntries: true }
  });

  await prisma.timeEntry.updateMany({ where: { id: { in: entries.map((entry) => entry.id) } }, data: { billed: true } });
  res.json(invoice);
});

router.patch('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  const { paid } = req.body;
  const updated = await prisma.invoice.updateMany({ where: { id, userId: req.user.id }, data: { paid: Boolean(paid) } });
  if (updated.count === 0) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ message: 'Invoice status updated' });
});

router.get('/:id/pdf', async (req, res) => {
  const prisma = req.app.get('prisma');
  const id = Number(req.params.id);
  if ((req.user.plan || 'FREE') !== 'PRO') {
    return res.status(403).json({ error: 'Invoice PDF export is available for Pro users only.' });
  }

  const invoice = await prisma.invoice.findFirst({ where: { id, userId: req.user.id }, include: { client: true, project: true } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.number}.pdf`);

  doc.fontSize(20).text('Invoice', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice #: ${invoice.number}`);
  doc.text(`Date: ${invoice.createdAt.toISOString().split('T')[0]}`);
  doc.text(`Due Date: ${invoice.dueDate ? invoice.dueDate.toISOString().split('T')[0] : 'N/A'}`);
  doc.moveDown();
  doc.text(`Client: ${invoice.client.name} (${invoice.client.company})`);
  doc.text(`Project: ${invoice.project.title}`);
  doc.moveDown();
  doc.text(`Total: $${invoice.total.toFixed(2)}`);
  doc.moveDown();
  doc.text(`Notes:`);
  doc.text(invoice.notes || 'No additional notes.');
  doc.end();
  doc.pipe(res);
});

module.exports = router;
