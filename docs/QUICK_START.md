# Quick Start Guide: New Tech Stack Features

This guide helps you start using the newly implemented monitoring, testing, and analytics features.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
# From monorepo root
pnpm install
```

### 2. Set Up Environment Variables

#### For API (`apps/api/.env`)

```bash
# Copy example and fill in values
cp apps/api/.env.example apps/api/.env

# Add these new variables:
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_here  # Optional: Get from sentry.io
RESEND_API_KEY=your_resend_key   # Optional: Get from resend.com
FROM_EMAIL="DevDocs AI <noreply@yourdomain.com>"
```

#### For Web (`apps/web/.env.local`)

```bash
# Create if doesn't exist
cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key  # Optional: Get from posthog.com
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EOF
```

### 3. Set Up Test Database

```bash
# Create test database for API tests
createdb devdocs_test

# Run migrations (if you have them)
cd apps/api
# pnpm db:migrate  # Uncomment when migrations are set up
```

---

## 📊 Using Structured Logging

### In Your Code

```typescript
import { logger } from '@/lib/logger';

// Instead of console.log
logger.info({ userId, projectId }, 'Project created successfully');

// For warnings
logger.warn({ userId, apiKey: '[REDACTED]' }, 'API key missing');

// For errors (automatically includes stack trace)
logger.error({ err, userId, context: 'payment' }, 'Payment failed');
```

### Viewing Logs in Development

```bash
cd apps/api
pnpm dev

# Logs will be pretty-printed with colors:
# [12:34:56] INFO: Project created successfully
#   userId: "abc123"
#   projectId: "proj_456"
```

### Production Logs

In production, logs are JSON-formatted for easy parsing by log aggregators:
```json
{"level":"info","time":1234567890,"userId":"abc123","msg":"Project created"}
```

---

## 🧪 Running Tests

### API Unit Tests

```bash
cd apps/api

# Run all tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test:watch

# With UI for debugging
pnpm test:ui

# With coverage report
pnpm test:coverage
```

### Writing New Tests

```typescript
// apps/api/src/routes/example.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { getAuthHeaders, createTestUser } from '../test/helpers';

describe('POST /example', () => {
  let authHeaders: Record<string, string>;

  beforeEach(async () => {
    const user = await createTestUser('test@example.com');
    authHeaders = await getAuthHeaders(user.id);
  });

  it('should create example', async () => {
    const response = await request(app)
      .post('/example')
      .set(authHeaders)
      .send({ name: 'Test' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### E2E Tests (Playwright)

```bash
cd apps/web

# Run all E2E tests
pnpm playwright test

# Run in headed mode (see browser)
pnpm playwright test --headed

# Run specific test file
pnpm playwright test tests/e2e/auth.spec.ts

# Debug mode with inspector
pnpm playwright test --debug

# Generate test code by recording actions
pnpm playwright codegen http://localhost:3000
```

---

## 🐛 Error Monitoring with Sentry

### Automatic Error Capture

Errors are automatically captured by Sentry middleware. No code changes needed!

### Manual Error Capture

```typescript
import { captureError, captureMessage } from '@/lib/sentry';

try {
  // your code
} catch (error) {
  captureError(error as Error, {
    userId,
    projectId,
    action: 'payment_processing',
  });
  throw error;
}

// For informational messages
captureMessage('Payment webhook received', 'info');
```

### Viewing Errors

1. Go to https://sentry.io
2. Select your project
3. View error details, stack traces, and user context

---

## 📧 Sending Emails

```typescript
import { sendWelcomeEmail, sendProjectCompleteEmail } from '@/lib/email';

// Send welcome email
await sendWelcomeEmail(user.email, user.displayName);

// Send project completion email
await sendProjectCompleteEmail(
  user.email,
  project.name,
  project.id
);
```

**Note:** Emails only send if `RESEND_API_KEY` is configured. Otherwise, a warning is logged.

---

## 📈 Tracking Analytics

### Initialize Analytics (once at app start)

```typescript
// apps/web/app/layout.tsx or _app.tsx
import { useEffect } from 'react';
import { initAnalytics, identifyUser } from '@/lib/analytics';

export default function Layout({ children }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return <>{children}</>;
}
```

### Track Events

```typescript
import { analytics } from '@/lib/analytics';

// Project created
analytics.projectCreated('saas', userId);

// Interview completed
analytics.interviewCompleted(projectId, 10, timeSpent, userId);

// Documentation downloaded
analytics.documentationDownloaded(projectId, 'markdown', userId);

// Custom event
trackEvent('custom_action', {
  userId,
  customProperty: 'value',
});
```

### Identify Users

```typescript
import { identifyUser } from '@/lib/analytics';

// After login
identifyUser(user.id, {
  email: user.email,
  name: user.displayName,
  plan: user.plan,
});
```

### View Analytics

1. Go to https://posthog.com
2. Navigate to your project
3. View events, user funnels, and session recordings

---

## 🔄 CI/CD Pipeline

### What Runs on Every Push/PR

1. **TypeScript Check** - Ensures all code compiles
2. **Linting** - Checks code style
3. **API Tests** - Runs all API unit tests with Postgres/Redis
4. **E2E Tests** - Runs Playwright tests
5. **Build Check** - Ensures production build succeeds

### Viewing Results

- Go to your GitHub repository
- Click "Actions" tab
- View workflow runs and logs

### Local Pre-Push Check

```bash
# Run what CI will run
pnpm typecheck
pnpm lint
cd apps/api && pnpm test
cd ../web && pnpm playwright test
pnpm build
```

---

## 🔧 Common Tasks

### Add a New API Route with Tests

1. Create route file: `apps/api/src/routes/myroute.ts`
2. Add structured logging:
   ```typescript
   import { logger } from '../lib/logger';
   
   router.get('/', async (req, res) => {
     logger.info({ userId: req.userId }, 'Route accessed');
     // ...
   });
   ```
3. Create test file: `apps/api/src/routes/myroute.test.ts`
4. Run tests: `pnpm test`

### Add a New E2E Test

1. Create test file: `apps/web/tests/e2e/feature.spec.ts`
2. Write test:
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test('should do something', async ({ page }) => {
     await page.goto('/');
     await expect(page.locator('h1')).toContainText('Expected');
   });
   ```
3. Run: `pnpm playwright test`

### Debug a Failing Test

```bash
# API test
cd apps/api
pnpm test:ui  # Opens UI to debug

# E2E test
cd apps/web
pnpm playwright test --debug  # Opens inspector
```

---

## 📝 Best Practices

### Logging

✅ **Do:**
- Use structured logging with context
- Include user IDs for debugging
- Log important state changes
- Use appropriate log levels (info, warn, error)

❌ **Don't:**
- Use console.log (use logger instead)
- Log sensitive data (API keys, passwords)
- Over-log (avoid logging in tight loops)

### Testing

✅ **Do:**
- Write tests for new features
- Test both success and error cases
- Use test helpers for common operations
- Clean up test data

❌ **Don't:**
- Skip tests because they're "too hard"
- Use production database for tests
- Leave console.log in test files

### Analytics

✅ **Do:**
- Track user actions that matter
- Include relevant context
- Respect user privacy

❌ **Don't:**
- Track PII without consent
- Track every single click
- Send sensitive data

---

## 🆘 Troubleshooting

### "Vitest tests fail with database error"

Make sure test database exists:
```bash
createdb devdocs_test
```

### "Playwright tests timeout"

Make sure dev server is running:
```bash
cd apps/web
pnpm dev
```

### "Logs not showing in development"

Check `LOG_LEVEL` environment variable:
```bash
export LOG_LEVEL=debug
```

### "Sentry not capturing errors"

1. Check `SENTRY_DSN` is set
2. Verify DSN is correct at sentry.io
3. Check Sentry initialization happens before other imports

---

## 📚 Additional Resources

- [Pino Documentation](https://getpino.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Resend Documentation](https://resend.com/docs)
- [PostHog Documentation](https://posthog.com/docs)

---

## 🎯 Next Steps

After you're comfortable with these tools:

1. **Replace Better Auth** - Migrate to Clerk or Lucia for better auth
2. **Migrate to Hono** - Faster API with better DX
3. **Implement tRPC** - Type-safe API calls

See `IMPLEMENTATION_PLAN.md` for detailed migration guides.
