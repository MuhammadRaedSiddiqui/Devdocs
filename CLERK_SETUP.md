# Clerk Authentication Setup Guide

## Overview

This application now uses Clerk for authentication, replacing Better Auth. Clerk provides:
- Built-in UI components for sign-in/sign-up
- Session management
- Social authentication (Google, GitHub, etc.)
- User management dashboard

---

## Getting Started

### 1. Create a Clerk Account

1. Go to https://clerk.com
2. Sign up for a free account
3. Create a new application

### 2. Get Your API Keys

From your Clerk dashboard:

1. Go to **API Keys** in the sidebar
2. Copy your keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

---

## Environment Variables

### Frontend (`apps/web/.env.local`)

```bash
# Clerk - Frontend
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Optional: Customize sign-in/sign-up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Backend (`apps/api/.env`)

```bash
# Clerk - Backend
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## How Authentication Works

### Frontend (Next.js)

1. **ClerkProvider** wraps the entire app in `app/layout.tsx`
2. **Middleware** (`middleware.ts`) protects routes automatically
3. **Public routes** are defined in middleware (homepage, sign-in, sign-up)
4. All other routes require authentication

### Backend (Express API)

1. **Clerk middleware** validates session tokens from the `Authorization` header
2. Token format: `Bearer <session_token>`
3. User info is extracted and added to `req.userId` and `req.userEmail`

### How Tokens Flow

```
Next.js Frontend
  ↓ (User signs in via Clerk)
  ↓ (Clerk session token stored in cookies)
  ↓
  ↓ (API call with Authorization header)
  ↓
Express API
  ↓ (Clerk middleware validates token)
  ↓ (Sets req.userId from Clerk user ID)
  ↓
Route Handler (has req.userId available)
```

---

## Using Auth in Your Code

### Frontend - Get Current User

```typescript
import { useUser } from '@clerk/nextjs';

export function MyComponent() {
  const { user, isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Not signed in</div>;

  return <div>Hello {user.firstName}!</div>;
}
```

### Frontend - Sign Out

```typescript
import { useClerk } from '@clerk/nextjs';

export function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

### Frontend - Protected Component

```typescript
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

export function ProtectedPage() {
  return (
    <>
      <SignedIn>
        <div>Protected content here</div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
```

### Backend - Access User Info

```typescript
// In any route handler after requireClerkAuth middleware
router.get('/my-route', async (req, res) => {
  const userId = req.userId;  // Clerk user ID
  const userEmail = req.userEmail;  // User's email

  // Use userId to query your database
  const projects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  res.json(projects);
});
```

---

## Database Schema Updates

### Option 1: Use Clerk User IDs Directly (Recommended)

Store Clerk's user ID (`user_xxx`) directly as your primary user identifier:

```typescript
// apps/api/src/schema.ts
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID (user_xxx)
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

### Option 2: Map Clerk Users to Internal IDs

Keep your existing UUID-based user system and add a `clerkId` field:

```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(), // NEW
  email: text("email").notNull().unique(),
  // ... rest of fields
});
```

---

## Migration from Better Auth

### Step 1: Update Database Schema

If using Option 2 (mapping), add the `clerkId` column:

```sql
ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;
```

### Step 2: Remove Better Auth

```bash
cd apps/api
pnpm remove better-auth

# Delete Better Auth files
rm src/lib/auth.ts
rm src/middleware/auth.ts  # Old Better Auth middleware

# Drop Better Auth tables (after backing up!)
psql devdocs -c "DROP TABLE IF EXISTS sessions CASCADE;"
psql devdocs -c "DROP TABLE IF EXISTS accounts CASCADE;"
```

### Step 3: Update Existing Users (if needed)

If you have existing users, you'll need to:
1. Have them sign in via Clerk
2. Match by email to existing user records
3. Update the `clerkId` field

Or start fresh with new Clerk-only users.

---

## Clerk Dashboard Features

### User Management

- View all users
- Ban/unban users
- Manually create users
- Reset passwords
- View user sessions

### Customization

- **Branding:** Add your logo and colors
- **Social Providers:** Enable Google, GitHub, etc.
- **Email Templates:** Customize verification emails
- **Session Duration:** Configure session length

### Security

- **Two-Factor Auth:** Enable 2FA
- **Password Requirements:** Set complexity rules
- **Rate Limiting:** Built-in brute force protection

---

## Troubleshooting

### "Invalid publishable key"

- Make sure you copied the correct key from Clerk dashboard
- Check that it starts with `pk_test_` or `pk_live_`
- Verify the key is in the correct environment file

### "Unauthorized" on API calls

- Check that the `Authorization` header is being sent
- Format: `Authorization: Bearer <token>`
- Verify `CLERK_SECRET_KEY` is set in API environment

### Frontend redirects to sign-in unexpectedly

- Check middleware configuration
- Ensure route is listed in `isPublicRoute`
- Verify Clerk keys are loaded

### "User not found" after migration

- User records may need to be created on first Clerk sign-in
- Implement user creation hook or sync logic

---

## Testing Authentication

### Manual Testing

1. Start both API and web:
   ```bash
   # Terminal 1
   cd apps/api && pnpm dev

   # Terminal 2  
   cd apps/web && pnpm dev
   ```

2. Visit http://localhost:3000
3. Try accessing `/dashboard` (should redirect to sign-in)
4. Sign up for a new account
5. After sign-in, should redirect to `/dashboard`

### Automated Testing

Update your E2E tests to use Clerk test accounts:

```typescript
// apps/web/tests/e2e/auth.spec.ts
test('should sign in and access dashboard', async ({ page }) => {
  // Clerk provides test user credentials
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

---

## Production Checklist

- [ ] Switch to production Clerk keys (`pk_live_` and `sk_live_`)
- [ ] Configure custom domain for Clerk (optional)
- [ ] Enable social providers you want (Google, GitHub, etc.)
- [ ] Set up webhook for user events (optional)
- [ ] Configure email provider for custom emails
- [ ] Test sign-in/sign-up flow in production
- [ ] Set up monitoring for auth failures
- [ ] Review Clerk security settings

---

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Express Guide](https://clerk.com/docs/backend-requests/handling/express)
- [Clerk API Reference](https://clerk.com/docs/reference/backend-api)
