const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./auth');
const clients = require('./controllers/clients');
const projects = require('./controllers/projects');
const tasks = require('./controllers/tasks');
const timeEntries = require('./controllers/timeEntries');
const invoices = require('./controllers/invoices');
const dashboard = require('./controllers/dashboard');
const { verifyToken } = require('./middleware');

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.set('prisma', prisma);

app.use('/auth', authRoutes);
app.use('/clients', verifyToken, clients);
app.use('/projects', verifyToken, projects);
app.use('/tasks', verifyToken, tasks);
app.use('/time-entries', verifyToken, timeEntries);
app.use('/invoices', verifyToken, invoices);
app.use('/dashboard', verifyToken, dashboard);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'FreelanceFlow API is running' });
  });
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});