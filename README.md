# FreelanceFlow

FreelanceFlow is a full-stack freelancer productivity app with client management, project tracking, time logging, invoices, and a SaaS-style plan experience.

## Features

- User authentication with registration and login
- Client and project management
- Task tracking and time entries
- Invoice generation and billing status
- Pro plan unlocks PDF invoice export and advanced budget tracking
- Dashboard with revenue, hours, active projects, pending invoices, and burn rate metrics

## Setup

1. Install dependencies:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

2. Create a PostgreSQL database and update `server/.env`:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/freelanceflow"
   JWT_SECRET="your-secret-key-here"
   PORT=4000
   ```

3. Reset and seed the database:
   ```bash
   npx prisma migrate reset --force --schema server/prisma/schema.prisma
   npm --prefix server run seed
   ```

## Run

- Start the backend server:
  ```bash
  npm --prefix server run dev
  ```

- Start the frontend app:
  ```bash
  npm --prefix client run dev
  ```

- Root workspace command to start both backend and frontend together:
  ```bash
  npm run dev
  ```

## Useful commands

- Build frontend:
  ```bash
  npm run build
  ```

- Start backend in production mode:
  ```bash
  npm start
  ```

## Deployment

1. Build the client for production:
   ```bash
   npm run build
   ```

2. Create a production `.env` file in `server` with:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/freelanceflow"
   JWT_SECRET="your-secret-key-here"
   PORT=4000
   NODE_ENV=production
   ```

3. Optionally set the frontend API base URL when your backend runs on a separate host:
   ```bash
   VITE_API_BASE="https://your-api.example.com"
   ```
   If the backend is served from the same origin, the app will use `/api` by default.

4. Start the production server from the workspace root:
   ```bash
   npm start
   ```

When `NODE_ENV=production`, the backend serves the built frontend from `client/dist`.

## Render deployment

Render can deploy this repo as a single full-stack service.

1. Push your code to GitHub.
2. In Render, create a new Web Service and connect your GitHub repo.
3. Use these settings:
   - Environment: `Node`
   - Branch: `main`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Root Directory: `/`
4. Add Render environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT` (Render already provides a port, but you can set it explicitly if desired)
   - `NODE_ENV=production`
5. Save and deploy.

You can also use the included `render.yaml` manifest to let Render auto-configure the service from the repo.

## Seeded account

- Email: `alex@freelanceflow.test`
- Password: `password123`

## Notes

- Backend: `server`
- Frontend: `client`
- Prisma schema: `server/prisma/schema.prisma`
