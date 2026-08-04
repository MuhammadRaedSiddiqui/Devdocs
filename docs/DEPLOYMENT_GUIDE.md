# Deployment Checklist

## Step 1: Create Clerk Account ⏳

1. **Go to:** https://clerk.com/sign-up
2. **Sign up** with GitHub or email
3. **Create new application:**
   - Application name: "DevDocs AI"
   - Choose authentication methods you want:
     - ✅ Email + Password (recommended)
     - ✅ Google (optional)
     - ✅ GitHub (optional)
4. **Get your keys** from the dashboard:
   - Go to: **API Keys** in sidebar
   - Copy **Publishable Key** (starts with `pk_test_`)
   - Copy **Secret Key** (starts with `sk_test_`)

**Save these keys - you'll need them next!**

---

## Step 2: Configure Environment Variables ⏳

### Backend (apps/api/.env)

Create or update `apps/api/.env`:

```bash
# Database (your existing connection string)
DATABASE_URL=postgresql://your_existing_connection_string

# Redis (your existing Redis)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Clerk (REQUIRED - paste your keys from Step 1)
CLERK_SECRET_KEY=sk_test_PASTE_YOUR_SECRET_KEY_HERE
CLERK_PUBLISHABLE_KEY=pk_test_PASTE_YOUR_PUBLISHABLE_KEY_HERE

# Encryption (generate a 64-character hex string)
ENCRYPTION_KEY=run_command_below_to_generate

# Optional but recommended
SENTRY_DSN=https://your_sentry_dsn_here
RESEND_API_KEY=re_your_resend_key_here
LOG_LEVEL=info

# App settings
WEB_URL=http://localhost:3000
PORT=4001
NODE_ENV=development
```

**Generate ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (apps/web/.env.local)

Create or update `apps/web/.env.local`:

```bash
# API URL (point to your Hono server with tRPC)
NEXT_PUBLIC_API_URL=http://localhost:4001

# Clerk (REQUIRED - paste the same keys from Step 1)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_PASTE_YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=sk_test_PASTE_YOUR_SECRET_KEY_HERE

# Clerk URLs (optional - defaults work fine)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Optional
NEXT_PUBLIC_SENTRY_DSN=https://your_sentry_dsn_here
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key_here

# App settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Run Database Migration ⏳

Add the `clerk_id` column to your users table:

```bash
# Option A: Using psql
psql devdocs < apps/api/migrations/add_clerk_id.sql

# Option B: Direct SQL
psql devdocs -c "ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;"
psql devdocs -c "CREATE INDEX idx_users_clerk_id ON users(clerk_id);"
```

**Verify migration worked:**
```bash
psql devdocs -c "\d users"
# Should see clerk_id column listed
```

---

## Step 4: Test Locally ⏳

### Terminal 1: Start API (Hono + tRPC)
```bash
cd apps/api
pnpm dev:hono
# Should start on port 4001
```

### Terminal 2: Start Web
```bash
cd apps/web
pnpm dev
# Should start on port 3000
```

### Terminal 3: Run Tests
```bash
cd apps/api
pnpm test
# Tests should pass
```

---

## Step 5: Test Authentication Flow ⏳

1. **Open browser:** http://localhost:3000
2. **Try to access dashboard:** http://localhost:3000/dashboard
3. **Should redirect to sign-in**
4. **Sign up for new account**
5. **Should redirect to dashboard after sign-up**
6. **Verify you can:**
   - Create a project
   - View projects list
   - Delete a project

**If everything works, authentication is set up correctly!**

---

## Step 6: Test tRPC Integration ⏳

Check your browser console, you should see tRPC requests to:
- `http://localhost:4001/trpc/projects.list`

Or test directly:
```bash
# Get auth token from browser (inspect → Application → Cookies → __session)
curl http://localhost:4001/trpc/projects.list \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## Step 7: Production Deployment ⏳

### Option A: Railway (Recommended for quick deploy)

**Backend:**
```bash
cd apps/api
# Railway will auto-detect and deploy
# Set environment variables in Railway dashboard
```

**Frontend:**
```bash
cd apps/web
# Deploy to Vercel (best for Next.js)
vercel --prod
```

### Option B: Docker (Full control)

**Build:**
```bash
# API
cd apps/api
docker build -t devdocs-api .

# Web
cd apps/web
docker build -t devdocs-web .
```

### Update Environment Variables for Production

**Important changes:**
1. Update `NEXT_PUBLIC_API_URL` to your production API URL
2. Update `WEB_URL` to your production web URL
3. Switch Clerk to production keys (`pk_live_` and `sk_live_`)
4. Set `NODE_ENV=production`

---

## Checklist Summary

- [ ] Step 1: Clerk account created, keys copied
- [ ] Step 2: Environment variables configured
- [ ] Step 3: Database migration run successfully
- [ ] Step 4: Local servers start without errors
- [ ] Step 5: Authentication flow works (sign up, sign in, dashboard)
- [ ] Step 6: tRPC requests work
- [ ] Step 7: Deployed to production (optional)

---

## Troubleshooting

### "CLERK_SECRET_KEY is not defined"
- Check you added the key to the correct .env file
- Restart the dev server after adding env vars

### "Project not found" after sign-up
- Database migration might not have run
- Check the `users` table has `clerk_id` column

### tRPC returns UNAUTHORIZED
- Check Clerk keys are correct
- Verify TRPCProvider is wrapping the app
- Check Authorization header is being sent

### Can't connect to database
- Verify DATABASE_URL is correct
- Check database is running
- Run migration script

---

**Next:** Tell me which step you're on, and I'll help if you get stuck!
