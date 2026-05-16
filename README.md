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

## Railway deployment

Railway can deploy this repo as a single full-stack service.

1. Push your code to GitHub.
2. On Railway, click "New Project" → "Deploy from GitHub" and select the `FreelanceFlow` repo.
3. Add a Postgres plugin from Railway's dashboard and copy the connection string.
4. Set environment variables in Railway:
   - `DATABASE_URL` (from Postgres plugin)
   - `JWT_SECRET` (any strong secret)
   - `NODE_ENV=production`
   - Optional: `VITE_API_BASE` (only if frontend calls a separate API; leave blank otherwise)
5. Configure deployment settings:
   - Root directory: `/`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. After deploy, run Prisma migrations in Railway's shell:
   ```bash
   npx prisma migrate deploy --schema=server/prisma/schema.prisma
   npm --prefix server run seed
   ```
7. Verify the public Railway URL loads the frontend.

### Troubleshooting Railway "not found" errors

If you see "not found" after deployment:

1. **Check Railway build logs:**
   - Open the Railway service → Deployments
   - Verify `npm run build` completed successfully (no errors)
   - Confirm `client/dist/index.html` exists in the build output

2. **Verify environment variables:**
   - Ensure `NODE_ENV=production` is set in Railway env vars
   - The server will only serve static files when `NODE_ENV === 'production'`

3. **Check the health endpoint (before accessing the app):**
   - Visit `https://your-railway-url.onrailway.app/api/health`
   - If you see `{"status":"ok","message":"...","env":"production"}`, the server is running correctly
   - If `env` shows `undefined`, `NODE_ENV` is not set

4. **Restart the deployment:**
   - After setting or fixing `NODE_ENV`, manually redeploy from Railway dashboard
   - Wait for the build and deployment to complete

5. **Check Railway logs for errors:**
   - In Railway → Logs, search for `[ERROR]` or `[PRODUCTION MODE]`
   - If you see errors about missing files, the dist folder may not have been built

6. **Verify the build command works locally:**
   ```bash
   npm install
   npm run build
   ls client/dist/index.html  # should exist
   npm start
   ```
   Then visit `http://localhost:4000` — it should load the frontend.

If issues persist:
- Double-check that all files were pushed to GitHub (`git log` to see commits)
- Manually trigger a redeploy from Railway after confirming changes are on GitHub
- Check if there are any build errors in the Railway logs

## Seeded account

- Email: `alex@freelanceflow.test`
- Password: `password123`

## Notes

- Backend: `server`
- Frontend: `client`
- Prisma schema: `server/prisma/schema.prisma`
