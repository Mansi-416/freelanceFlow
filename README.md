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

## Seeded account

- Email: `alex@freelanceflow.test`
- Password: `password123`

## Notes

- Backend: `server`
- Frontend: `client`
- Prisma schema: `server/prisma/schema.prisma`
