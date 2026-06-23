# Bench Readiness

AI-led voice interview and assessment platform. Candidates take structured technical interviews via voice or text; bench managers review transcripts, AI scores, and sign off with a readiness verdict.

---

## Architecture

```
Next.js 16 (App Router)  ←→  API Gateway (localhost:6002)  ←→  Services
        ↓
  PostgreSQL (bench_readiness DB)
```

- **Frontend** — this repo, Next.js 16, Tailwind CSS v4, TypeScript
- **API Gateway** — runs at `http://localhost:6002`, handles all business logic, auth, and DB writes
- **Auth** — cookie-based session (`br_jwt`, `br_role`, `br_username`). JWT decoded client-side for username display. SSO/OIDC is disabled.

---

## Roles & Route Guards

| Role | Accessible Routes |
|---|---|
| `CANDIDATE` | `/login`, `/register`, `/candidate/dashboard`, `/candidate/feedback/:id`, `/interview/:id` |
| `ENGINEER` | `/engineer` |
| `BENCH_MANAGER` | `/admin/*`, `/observer/*` |
| `PRACTICE_LEAD` | `/admin/*`, `/observer/*`, `/practice` |
| `TALENT` | `/admin/*`, `/talent` |
| `COMPLIANCE` | `/compliance` |

Unauthenticated users are redirected to `/login?next=<path>`.

---

## Pages

### Public
| Route | Description |
|---|---|
| `/login` | Two-tab login — Candidate (email + password) and Staff (username + password + role) |
| `/register` | Candidate self-registration — calls `POST /auth/register` |

### Candidate
| Route | Description |
|---|---|
| `/candidate/dashboard` | Upcoming and past interviews. Upcoming = `SCHEDULED` / `IN_PROGRESS`. Past = `COMPLETED` / `REVIEW_PENDING` / `SIGNED_OFF` or expired `SCHEDULED` (>24h). Verdict column shows status-aware badges. |
| `/candidate/feedback/:id` | AI scores (dimension, value/10, rationale, evidence) + manager sign-off verdict and note |
| `/interview/:id` | Live voice interview — Web Speech API, typed fallback, 10-slot AI question flow |

### Manager / Staff
| Route | Description |
|---|---|
| `/admin` | Manager dashboard |
| `/admin/setup` | Create interview — candidate search (auto-fills email/name), JD, resume summary, interview mode, duration. Loading state on submit. |
| `/admin/review` | List of interviews pending review |
| `/admin/interviews/:id/review` | Full review — AI assessment, chat-style transcript, scores, behavioral signals, resume consistency, sign-off form |
| `/admin/staff` | Staff management |
| `/admin/settings/tokens` | Token usage settings |
| `/observer/interview/:id` | Live observer view |
| `/engineer` | Engineer dashboard |
| `/talent` | Talent dashboard — questions and rubrics |
| `/practice` | Practice Lead dashboard |
| `/compliance` | Compliance dashboard |

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running (default: `localhost:3308`)
- API Gateway running at `http://localhost:6002`

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:<password>@localhost:<port>/bench_readiness"
AUTH_SECRET="your-secret-here"
NEXT_PUBLIC_API_URL="http://localhost:6002"
```

> `AUTH_SECRET` is used to sign demo session cookies. Change it in production.

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Login

### Candidate login
- Go to `/login` → Candidate tab
- Enter registered email and password
- Redirects to `/candidate/dashboard`

### Staff login
- Go to `/login` → Staff tab
- Enter username, password, and select role
- `BENCH_MANAGER` / `PRACTICE_LEAD` → `/admin`
- Others → `/dashboard`

### Demo credentials (dev only)
- Username: `Demo` / Password: `Demo123`
- Select any staff role from the dropdown

---

## API Endpoints Used

All calls go through the gateway at `NEXT_PUBLIC_API_URL`.

| Method | Path | Used by |
|---|---|---|
| `POST` | `/auth/login` | Login page |
| `POST` | `/auth/register` | Register page |
| `GET` | `/auth/candidates?search=` | Candidate search in setup form |
| `GET` | `/interviews/mine` | Candidate dashboard |
| `GET` | `/interviews/:id` | Interview page, feedback page, review page |
| `GET` | `/interviews/jd/:jdId` | JD title lookup |
| `GET` | `/interviews/plans/:planId` | Interview plan slots |
| `GET` | `/interviews/summary` | Review page candidate info |
| `POST` | `/interviews` | Create interview |
| `PATCH` | `/interviews/:id/complete` | Mark interview complete |
| `POST` | `/ai/next-question` | Voice interview question generation |
| `POST` | `/ai/assess` | Post-interview AI scoring |
| `GET` | `/scores/:id` | Scores for review / feedback |
| `POST` | `/scores` | Save AI scores |
| `GET` | `/reviews/:id` | Manager sign-off status |
| `POST` | `/reviews/:id/sign-off` | Submit manager sign-off |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Secret for signing session cookies |
| `NEXT_PUBLIC_API_URL` | Yes | API gateway base URL (e.g. `http://localhost:6002`) |

---

## Deployment

### Build

```bash
npm run build
npm start
```

### Deploy with Nginx (recommended for VPS/EC2)

#### 1. Build the app

```bash
npm ci
npm run build
```

#### 2. Run with PM2

Install PM2 globally if not already installed:

```bash
npm install -g pm2
```

Start the Next.js server:

```bash
NODE_ENV=production pm2 start npm --name "bench-readiness" -- start
pm2 save
pm2 startup
```

Next.js will listen on `http://localhost:3000` by default.

To use a different port:

```bash
NODE_ENV=production PORT=3000 pm2 start npm --name "bench-readiness" -- start
```

#### 3. Configure Nginx

Install Nginx:

```bash
sudo apt update && sudo apt install nginx -y
```

Create a site config:

```bash
sudo nano /etc/nginx/sites-available/bench-readiness
```

Paste the following (replace `your-domain.com` with your actual domain or server IP):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Increase body size for JD/resume paste
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/bench-readiness /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Enable HTTPS with Certbot (optional but recommended)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

Certbot will auto-update the Nginx config with SSL settings.

#### 5. Set environment variables

Create `/etc/bench-readiness.env` or set them inline in the PM2 ecosystem file.

Recommended — create a PM2 ecosystem file `ecosystem.config.js` in the project root:

```js
module.exports = {
  apps: [
    {
      name: "bench-readiness",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/path/to/AiInterviewBot",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "postgresql://user:password@localhost:5432/bench_readiness",
        AUTH_SECRET: "<strong-random-secret>",
        NEXT_PUBLIC_API_URL: "https://your-api-gateway.example.com",
      },
    },
  ],
};
```

Then start with:

```bash
pm2 start ecosystem.config.js
pm2 save
```

#### 6. Run database migrations

```bash
npx prisma migrate deploy
```

#### Full deployment checklist

- [ ] `npm ci && npm run build` completed without errors
- [ ] `.env` or `ecosystem.config.js` has all required variables
- [ ] `npx prisma migrate deploy` run against production DB
- [ ] PM2 process running (`pm2 status`)
- [ ] Nginx config tested (`sudo nginx -t`) and reloaded
- [ ] HTTPS enabled via Certbot
- [ ] API Gateway running at the configured `NEXT_PUBLIC_API_URL`

---

### Docker (alternative)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add to `next.config.ts` for standalone output:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

---

## Project Structure

```
src/
├── app/
│   ├── admin/              # Manager pages (setup, review, staff, settings)
│   ├── api/                # Next.js API routes (proxy to gateway + auth cookies)
│   ├── candidate/          # Candidate dashboard and feedback pages
│   ├── components/         # AppShell, LogoutButton
│   ├── interview/[id]/     # Live interview + voice client
│   ├── login/              # Two-tab login page
│   ├── register/           # Candidate registration
│   └── ...                 # engineer, talent, practice, compliance, observer
├── lib/
│   ├── apiClient.ts        # Server-side fetch helper with JWT forwarding
│   └── session.ts          # Cookie-based session reader + JWT decoder
├── server/
│   ├── demoAuth.ts         # HMAC-signed demo session (dev only)
│   └── roles.ts            # UserRole type and constants
└── middleware.ts            # RBAC route guards
```

---

## Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start production server
npm run lint         # ESLint
npm run db:migrate   # Run Prisma migrations (dev)
npm run db:studio    # Open Prisma Studio
```
