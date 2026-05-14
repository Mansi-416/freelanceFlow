const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const password = bcrypt.hashSync('password123', 10);
  const user = await prisma.user.create({ data: { name: 'Alex Freelancer', email: 'alex@freelanceflow.test', password, plan: 'FREE' } });

  const clientA = await prisma.client.create({ data: { name: 'Acme Co', company: 'Acme Corporation', email: 'hello@acme.com', phone: '555-0101', notes: 'Preferred client', defaultHourlyRate: 95, userId: user.id } });
  const clientB = await prisma.client.create({ data: { name: 'Bright Labs', company: 'Bright Labs LLC', email: 'team@brightlabs.io', phone: '555-0202', notes: 'New product launch', defaultHourlyRate: 90, userId: user.id } });

  const projectA = await prisma.project.create({ data: { title: 'Website redesign', description: 'Revamp homepage and UX flows', status: 'ONGOING', hourlyRate: 95, clientId: clientA.id, userId: user.id } });
  const projectB = await prisma.project.create({ data: { title: 'Marketing automation', description: 'Build campaign workflows and analytics dashboards', status: 'PAUSED', hourlyRate: 90, clientId: clientB.id, userId: user.id } });

  const taskA = await prisma.task.create({ data: { title: 'Design new landing page', description: 'Create UI mockups and review with client', status: 'IN_PROGRESS', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), projectId: projectA.id, userId: user.id } });
  const taskB = await prisma.task.create({ data: { title: 'Connect CRM integration', description: 'Sync leads and email events', status: 'PENDING', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), projectId: projectB.id, userId: user.id } });

  await prisma.timeEntry.createMany({ data: [
    { description: 'Initial discovery call', startTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), durationMinutes: 90, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), projectId: projectA.id, taskId: taskA.id, userId: user.id },
    { description: 'Wireframe review', startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000), durationMinutes: 120, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), projectId: projectA.id, taskId: taskA.id, userId: user.id },
    { description: 'API mapping session', startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 80 * 60 * 1000), durationMinutes: 80, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), projectId: projectB.id, taskId: taskB.id, userId: user.id }
  ]});

  await prisma.invoice.create({ data: { number: 'INV-1001', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), total: 1750, paid: false, clientId: clientA.id, projectId: projectA.id, userId: user.id, notes: 'Deposit invoice for redesign' } });
  await prisma.invoice.create({ data: { number: 'INV-1002', dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), total: 2100, paid: false, clientId: clientB.id, projectId: projectB.id, userId: user.id, notes: 'Retainer invoice for automation work' } });

  console.log('Seed complete. Login with alex@freelanceflow.test / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
