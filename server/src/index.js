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

app.use('/api/auth', authRoutes);
app.use('/api/clients', verifyToken, clients);
app.use('/api/projects', verifyToken, projects);
app.use('/api/tasks', verifyToken, tasks);
app.use('/api/time-entries', verifyToken, timeEntries);
app.use('/api/invoices', verifyToken, invoices);
app.use('/api/dashboard', verifyToken, dashboard);

// Health check endpoint (always available)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FreelanceFlow API is running', env: process.env.NODE_ENV });
});

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  console.log(`[PRODUCTION MODE] Serving static files from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    console.log(`[ROUTER] Catch-all route hit for: ${req.path}`);
    const indexPath = path.join(clientDist, 'index.html');
    console.log(`[ROUTER] Sending index.html from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`[ERROR] Failed to send index.html: ${err.message}`);
        try {
          const fs = require('fs');
          const rootDir = path.join(__dirname, '..', '..');
          const clientDir = path.join(rootDir, 'client');
          const clientDistDir = path.join(clientDir, 'dist');
          
          let debugInfo = {
            error: err.message,
            __dirname: __dirname,
            indexPath: indexPath,
            rootDirExists: fs.existsSync(rootDir),
            clientDirExists: fs.existsSync(clientDir),
            clientDistExists: fs.existsSync(clientDistDir),
            rootDirContents: fs.existsSync(rootDir) ? fs.readdirSync(rootDir) : [],
            clientDirContents: fs.existsSync(clientDir) ? fs.readdirSync(clientDir) : [],
            clientDistContents: fs.existsSync(clientDistDir) ? fs.readdirSync(clientDistDir) : []
          };
          res.status(500).json(debugInfo);
        } catch (e) {
          res.status(500).send(`Error loading app. Debug failed: ${e.message}`);
        }
      }
    });
  });
} else {
  console.log('[DEVELOPMENT MODE]');
  app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'FreelanceFlow API is running' });
  });
}

const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});