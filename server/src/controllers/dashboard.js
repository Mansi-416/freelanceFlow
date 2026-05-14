const express = require('express');
const router = express.Router();

router.get('/revenue', async (req, res) => {
  const prisma = req.app.get('prisma');
  const projects = await prisma.project.findMany({ where: { userId: req.user.id }, include: { timeEntries: true, client: true } });
  const invoices = await prisma.invoice.findMany({ where: { userId: req.user.id } });
  const upcomingTasks = await prisma.task.findMany({
    where: {
      userId: req.user.id,
      status: { not: 'DONE' },
      dueDate: { gte: new Date() }
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
    include: { project: true }
  });

  const hours = projects.reduce((sum, project) => sum + project.timeEntries.reduce((p, entry) => p + entry.durationMinutes, 0), 0) / 60;
  const revenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const clientsCount = await prisma.client.count({ where: { userId: req.user.id } });
  const projectsCount = projects.length;
  const activeProjects = projects.filter((project) => project.status === 'ONGOING').length;
  const pendingInvoices = invoices.filter((invoice) => !invoice.paid).length;

  const projectBurnRates = projects.map((project) => {
    const totalMinutes = project.timeEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const budgetUsed = (totalMinutes / 60) * project.hourlyRate;
    const utilization = project.budget > 0 ? Math.round((budgetUsed / project.budget) * 100) : 0;
    return {
      projectId: project.id,
      title: project.title,
      budget: project.budget,
      burnRate: Math.round(budgetUsed * 100) / 100,
      budgetRemaining: Math.max(Math.round((project.budget - budgetUsed) * 100) / 100, 0),
      utilization: Math.min(utilization, 999)
    };
  });

  res.json({
    revenue,
    hours: Math.round(hours * 100) / 100,
    clientsCount,
    projectsCount,
    invoiceCount: invoices.length,
    activeProjects,
    pendingInvoices,
    upcomingDeadlines: upcomingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      project: task.project?.title || 'No project'
    })),
    projectBurnRates,
    plan: req.user.plan || 'FREE'
  });
});

router.get('/financials', async (req, res) => {
  const prisma = req.app.get('prisma');
  const invoices = await prisma.invoice.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } });
  const today = new Date();
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    return {
      label: date.toLocaleString('default', { month: 'short' }),
      year: date.getFullYear(),
      start: new Date(date),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    };
  });

  const monthlyRevenue = months.map(({ label, year, start, end }) => {
    const monthTotal = invoices.reduce((sum, invoice) => {
      const created = new Date(invoice.createdAt);
      return created >= start && created <= end ? sum + invoice.total : sum;
    }, 0);
    return { month: `${label} ${year}`, revenue: Math.round(monthTotal * 100) / 100 };
  });

  const outstandingPayments = invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.total, 0);
  res.json({ monthlyRevenue, outstandingPayments, invoiceCount: invoices.length });
});

router.get('/summary', async (req, res) => {
  const prisma = req.app.get('prisma');
  const invoices = await prisma.invoice.findMany({ where: { userId: req.user.id }, include: { client: true, project: true } });
  const recent = invoices.slice(0, 5);
  res.json({ recent });
});

module.exports = router;
