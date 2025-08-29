Live Website: 
https://eduflowstudentportal.netlify.app/

### Global LMS & Student Portal

Modern full‑stack Learning Management System monorepo featuring a Node.js/Express + MongoDB backend and a Vite/React TypeScript frontend. Includes authentication, courses, lessons, quizzes, enrollments, certificates, notifications, analytics, file uploads (local/S3), and production‑ready deployment to Netlify/Render.

## Repository Structure

```
.
├── src/                         # Backend (Node.js/Express)
│   ├── config/                  # MongoDB, S3, Supabase
│   ├── middleware/              # auth, upload handlers
│   ├── models/                  # Mongoose models
│   ├── routes/                  # REST API routes
│   └── index.js                 # Express app entry
├── frontend/                    # Frontend (Vite + React + TS)
│   ├── client/                  # App, pages, components, lib
│   ├── server/                  # Dev server integration (Express)
│   ├── dist/                    # Build output
│   ├── netlify.toml             # Netlify config
│   ├── vite.config.ts           # SPA build config
│   └── vite.config.server.ts    # SSR/server build config
├── scripts/                     # Deployment and URL utilities
├── render.yaml                  # Render backend service config
├── DEPLOYMENT_GUIDE.md          # Centralized URL & env setup
├── NETLIFY_RENDER_DEPLOYMENT.md # Step‑by‑step hosting guide
├── MONGODB_ATLAS_SETUP.md       # Atlas migration guide
├── S3_BUCKET_SETUP_GUIDE.md     # S3 permissions guide
└── package.json                 # Backend scripts & deps
```

## Tech Stack

- Backend
  - Express for HTTP server and routing
  - MongoDB with Mongoose ODM
  - JWT for auth (`jsonwebtoken`), password hashing (`bcryptjs`)
  - Validation via `joi` and `express-validator`
  - Security: `helmet`, CORS, `express-rate-limit`
  - File uploads: `multer` (disk in dev, memory in prod) + `aws-sdk`/S3 and `multer-s3` helper
  - Email via `nodemailer`
- Frontend
  - React 18, TypeScript, Vite
  - UI: Tailwind CSS, Radix UI, lucide-react, shadcn‑style components
  - Routing with `react-router-dom`
  - Data fetching with `@tanstack/react-query`
  - Charts with `recharts`
  - PDF/Canvas: `jspdf`, `html2canvas`
  - Dev server integration exposes Express routes during `vite` dev
- DevOps/Hosting
  - Netlify for SPA hosting
  - Render for backend Node service

## Features

- Authentication: register, login, token refresh, role‑based guards (admin, instructor, student, parent, etc.)
- Courses: CRUD, thumbnails, tags, difficulty, featured, curriculum, overview
- Lessons: content upload (pdf/video), attachments
- Quizzes and Attempts: creation and participation endpoints
- Enrollments and Progress tracking
- Certificates generation (PDF)
- Notifications and Analytics endpoints
- File serving for uploads with CSP/CORS headers
- Health check endpoint

## Backend Overview

- Entry: `src/index.js` sets up security, CORS, body parsing, rate limiting, static file serving, routes, error handling, 404 handler, and starts the server.
- Database: `src/config/database.js` connects to MongoDB/Atlas with retries and graceful shutdown.
- Auth: `src/middleware/auth.js` verifies JWT, attaches `req.user`, and provides role guards.
- Uploads: `src/middleware/upload.js` configures `multer` (disk vs memory by env), validates file types/sizes via `src/config/s3.js`, and converts to S3 URLs in production.
- S3: `src/config/s3.js` wraps `aws-sdk` S3 upload/delete and enforces limits/types.
- Supabase (optional): `src/config/supabase.js` service and anon clients for future integrations.
- Routes mounted under `/api/*`:
  - `auth`, `users`, `courses`, `lessons`, `quizzes`, `quiz-attempts`, `enrollments`, `progress`, `certificates`, `analytics`, `affiliations`, `franchise`, `notifications`, `contact`.

### Key Environment Variables (Backend)

```
# Server
PORT=3001
NODE_ENV=development            # or production
FRONTEND_URL=http://localhost:8080

# MongoDB
MONGODB_URI=mongodb://localhost:27017/global_lms
MONGODB_URI_PROD=
# Auth
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
MAIL_USER=
MAIL_PASS=
ADMIN_EMAIL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@globallms.com

# Uploads / Limits
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Supabase (optional)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

## Frontend Overview

- Entry: `frontend/client/App.tsx` sets routing and providers (React Query, Tooltips, Toasters, `AuthProvider`).
- Environment config: `frontend/client/config/environment.ts` centralizes `ENV` and helpers.
- API service and endpoints: `frontend/client/lib/api.ts` and `frontend/client/config/api.ts` (typed usage, auth headers, uploads, retries).
- Styling: Tailwind (`tailwind.config.ts`, `postcss.config.js`).
- Dev server: `frontend/vite.config.ts` registers an Express app during `vite` serve for demo endpoints.

### Key Environment Variables (Frontend)

```
VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Global LMS
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_CERTIFICATES=true
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm,application/pdf
VITE_JWT_STORAGE_KEY=token
VITE_USER_STORAGE_KEY=user
VITE_DEFAULT_PAGE_SIZE=10
VITE_MAX_PAGE_SIZE=100
VITE_THEME=light
VITE_LANGUAGE=en
```

## Running Locally

Backend

```
npm install
npm run dev         # starts Express on http://localhost:3001
```

Frontend

```
cd frontend
npm install
npm run dev         # starts Vite on http://localhost:8080
```

Health check: `GET http://localhost:3001/health`

## Build & Start

- Backend: `npm start` (no build step required)
- Frontend: `cd frontend && npm run build && npm start`

## API Overview

Base URL: `${BACKEND_URL}/api`

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/change-password`, `POST /auth/logout`
- Courses: `GET /courses`, `GET /courses/my` (instructor), `GET /courses/:id`, `POST /courses` (instructor/admin, thumbnail upload), `PUT /courses/:id`, `DELETE /courses/:id`
- Lessons: CRUD with file uploads
- Quizzes: CRUD; Quiz attempts under `/quiz-attempts`
- Enrollments: manage student enrollments
- Progress: lesson completion tracking
- Certificates: generation and retrieval
- Notifications, Affiliations, Franchise, Analytics, Contact: supporting features

Authentication

- Bearer token in `Authorization: Bearer <jwt>`
- Role guards via middleware: `requireAdmin`, `requireInstructor`, `requireAdminOrInstructor`, etc.

## File Uploads

- Development: stored under `/uploads` and served from Express static routes
- Production: uploaded to S3; URLs returned by API
- Size/type limits enforced in `src/config/s3.js`

## Security

- `helmet` with CSP tuned for embedding from configured `FRONTEND_URL`
- CORS allowlist aligned with local dev and production domains
- Rate limiting defaults: 100 requests / 15 minutes
- Input validation with `joi` and `express-validator`

## Deployment

- Frontend (Netlify): `frontend/netlify.toml` sets build and redirects; see `NETLIFY_RENDER_DEPLOYMENT.md` and `FRONTEND_CONFIG.md`.
- Backend (Render): `render.yaml` defines service; set environment vars in dashboard; see `NETLIFY_RENDER_DEPLOYMENT.md`.
- Centralized URL guidance: `DEPLOYMENT_GUIDE.md`.
- MongoDB Atlas migration: `MONGODB_ATLAS_SETUP.md`.
- S3 setup: `S3_BUCKET_SETUP_GUIDE.md`.

## NPM Scripts

Backend (`package.json`)

- `dev`: start with nodemon
- `start`: start Express
- `start:prod`: production start with `NODE_ENV=production`
- `migrate:atlas`, `migrate:backup`, `test:atlas`, `test:both`, `test:email`
- `deploy:prepare`, `deploy:netlify-render`, `urls:replace`

Frontend (`frontend/package.json`)

- `dev`: Vite dev server
- `build`: client + server builds
- `start`: serve built server bundle
- `typecheck`, `test` (vitest), `format.fix`

## Pages (Frontend)

`/`, `/courses`, `/course/:id`, `/lesson/:id`, `/quiz/:id`, `/my-learning`, `/profile`, `/certificate`, `/instructor-dashboard`, `/lessons`, `/admin`, `/affiliations`, `/franchise`, `/login`, `/register`, policies and info pages.

## Notes & Tips

- Ensure `FRONTEND_URL` and `VITE_API_URL` are consistent across environments to avoid CORS issues.
- For production uploads, confirm S3 public access policy and CORS as per guide.
- Use the health endpoint and logs to verify environment boot.

