# tRPC Implementation Guide - Complete Type Safety

**Status:** ✅ Complete  
**Benefits:** Full end-to-end type safety, autocomplete, compile-time error checking  
**Migration:** REST API → tRPC (projects route complete)

---

## 🎯 What is tRPC?

tRPC enables you to build fully type-safe APIs without schemas or code generation. Changes to your backend are instantly reflected in your frontend with TypeScript.

**Key Benefits:**
- ✨ **No code generation** - Types flow automatically
- ✨ **Autocomplete everywhere** - IDE knows your entire API
- ✨ **Catch errors at compile time** - Not runtime
- ✨ **Refactor with confidence** - Rename in one place, updates everywhere
- ✨ **Better DX** - No more API documentation needed

---

## 📦 What Was Installed

### Backend (apps/api)
```bash
pnpm add @trpc/server
```

### Frontend (apps/web)
```bash
pnpm add @trpc/client @trpc/react-query @tanstack/react-query
```

---

## 📁 File Structure

```
apps/api/src/
└── trpc/
    ├── context.ts           # Auth context for procedures
    ├── trpc.ts              # tRPC initialization
    ├── router.ts            # Main app router (exports type)
    └── routers/
        └── projects.ts      # Projects procedures

apps/web/
├── lib/
│   └── trpc.ts              # tRPC client config
└── components/
    ├── providers/
    │   └── trpc-provider.tsx  # Provider with Clerk auth
    └── examples/
        └── projects-list-trpc.tsx  # Usage examples
```

---

## 🔧 How It Works

### 1. Backend: Define Procedures

```typescript
// apps/api/src/trpc/routers/projects.ts
export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Return data - TypeScript infers the type!
    return await db.select().from(projects).where(eq(projects.userId, ctx.userId));
  }),

  create: protectedProcedure
    .input(ProjectCreateSchema)  // Zod validation
    .mutation(async ({ ctx, input }) => {
      return await db.insert(projects).values({
        userId: ctx.userId,
        ...input,
      });
    }),
});
```

### 2. Export Router Type

```typescript
// apps/api/src/trpc/router.ts
export const appRouter = router({
  projects: projectsRouter,
});

// This type is imported by the frontend!
export type AppRouter = typeof appRouter;
```

### 3. Frontend: Use Typed Hooks

```typescript
// apps/web/components/my-component.tsx
import { trpc } from '@/lib/trpc';

export function MyComponent() {
  // Fully typed! IDE autocomplete for everything
  const { data: projects } = trpc.projects.list.useQuery();

  const createProject = trpc.projects.create.useMutation();

  // TypeScript knows exactly what you can pass
  await createProject.mutateAsync({
    name: 'New Project',
    type: 'saas',  // Type-checked!
  });

  return (
    <div>
      {projects?.map(p => (
        <div key={p.id}>
          {p.name} {/* Autocomplete works! */}
        </div>
      ))}
    </div>
  );
}
```

---

## ✨ The Magic: Type Flow

```
Backend Router (TypeScript)
  ↓
Export `AppRouter` type
  ↓
Import in Frontend
  ↓
Full type safety in React hooks
  ↓
Autocomplete, error checking, refactoring support
```

**No code generation, no API documentation, no manual typing!**

---

## 🚀 Usage Examples

### Query (GET data)

```typescript
// Simple query
const { data, isLoading, error } = trpc.projects.list.useQuery();

// Query with parameters
const { data: project } = trpc.projects.get.useQuery({ id: 'project-id' });

// Conditional query (only runs when enabled)
const { data } = trpc.projects.get.useQuery(
  { id: projectId },
  { enabled: !!projectId }
);

// Refetch manually
const { refetch } = trpc.projects.list.useQuery();
await refetch();
```

### Mutation (POST/PATCH/DELETE)

```typescript
// Create mutation
const createProject = trpc.projects.create.useMutation();

await createProject.mutateAsync({
  name: 'My Project',
  type: 'saas',
});

// With callbacks
const updateProject = trpc.projects.update.useMutation({
  onSuccess: (data) => {
    console.log('Updated!', data);
  },
  onError: (error) => {
    console.error('Failed:', error.message);
  },
});

// Check mutation state
if (createProject.isPending) return <div>Creating...</div>;
if (createProject.isError) return <div>Error!</div>;
```

### Optimistic Updates

```typescript
const utils = trpc.useUtils();

const deleteProject = trpc.projects.delete.useMutation({
  // Optimistic update
  onMutate: async ({ id }) => {
    // Cancel outgoing refetches
    await utils.projects.list.cancel();

    // Snapshot previous value
    const previous = utils.projects.list.getData();

    // Optimistically update
    utils.projects.list.setData(undefined, (old) =>
      old?.filter((p) => p.id !== id)
    );

    return { previous };
  },

  // Rollback on error
  onError: (err, variables, context) => {
    utils.projects.list.setData(undefined, context?.previous);
  },

  // Always refetch after success or error
  onSettled: () => {
    utils.projects.list.invalidate();
  },
});
```

---

## 🔐 Authentication

Authentication is handled automatically via tRPC context:

```typescript
// Backend: Context extracts user from Clerk token
export async function createContext(opts: FetchCreateContextFnOptions) {
  const token = opts.req.headers.get('Authorization')?.replace('Bearer ', '');
  const user = await clerkClient.users.getUser(userId);
  return { userId: user.id, userEmail: user.email };
}

// Backend: Protected procedure requires auth
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx });
});

// Frontend: Token automatically included
// TRPCProvider uses Clerk's getToken() to add auth header
```

---

## 🏗️ Creating New Routes

### Step 1: Create Router

```typescript
// apps/api/src/trpc/routers/myroute.ts
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const myRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Your logic
    return data;
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      value: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Your logic
      return result;
    }),
});
```

### Step 2: Add to App Router

```typescript
// apps/api/src/trpc/router.ts
import { myRouter } from './routers/myroute';

export const appRouter = router({
  projects: projectsRouter,
  myRoute: myRouter,  // ← Add here
});
```

### Step 3: Use in Frontend

```typescript
// Automatically typed!
const { data } = trpc.myRoute.list.useQuery();
const create = trpc.myRoute.create.useMutation();
```

**That's it!** No additional configuration needed.

---

## 🔄 Migration Strategy

### Current State
- ✅ Projects route migrated to tRPC
- ⏳ Keys route (REST)
- ⏳ AI stream route (REST)

### Recommended Approach

1. **Keep both REST and tRPC running** (hybrid mode)
2. **Migrate routes one by one**
3. **Update frontend components incrementally**
4. **Remove REST routes when all consumers migrated**

### Migrating a Component

```typescript
// Before (REST)
const [projects, setProjects] = useState([]);
useEffect(() => {
  fetch('/api/projects')
    .then(r => r.json())
    .then(setProjects);
}, []);

// After (tRPC)
const { data: projects } = trpc.projects.list.useQuery();
```

---

## 🧪 Testing tRPC

### Unit Testing Procedures

```typescript
// apps/api/src/trpc/routers/projects.test.ts
import { appRouter } from '../router';
import { createContext } from '../context';

describe('Projects Router', () => {
  it('lists projects for authenticated user', async () => {
    const ctx = await createContext({
      req: new Request('http://localhost', {
        headers: { Authorization: 'Bearer test-token' },
      }),
      resHeaders: new Headers(),
    });

    const caller = appRouter.createCaller(ctx);
    const projects = await caller.projects.list();

    expect(Array.isArray(projects)).toBe(true);
  });
});
```

### Integration Testing

```typescript
// Test the full tRPC endpoint
const response = await fetch('http://localhost:4001/trpc/projects.list', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  },
});

const result = await response.json();
```

---

## 🎯 Best Practices

### 1. Input Validation with Zod

```typescript
// Always validate inputs
.input(z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
}))
```

### 2. Error Handling

```typescript
// Use proper tRPC error codes
throw new TRPCError({
  code: 'NOT_FOUND',  // or BAD_REQUEST, UNAUTHORIZED, etc.
  message: 'Project not found',
});
```

### 3. Return Types

```typescript
// Let TypeScript infer return types - don't manually type
// ✅ Good
.query(async ({ ctx }) => {
  return await db.select().from(projects);
})

// ❌ Bad (unnecessary)
.query(async ({ ctx }): Promise<Project[]> => {
  return await db.select().from(projects);
})
```

### 4. Context Usage

```typescript
// Always use ctx for user info
.query(async ({ ctx }) => {
  // ✅ Good
  const userId = ctx.userId;

  // ❌ Bad - don't pass userId as input
  // Security risk! User could pass any ID
})
```

---

## 🚨 Common Pitfalls

### 1. Type Import Issues

**Problem:** Frontend can't find `AppRouter` type

**Solution:** Make sure `@devdocs/api` is in workspace dependencies

```json
// apps/web/package.json
{
  "dependencies": {
    "@devdocs/shared": "workspace:*",
    "@devdocs/api": "workspace:*"  // ← Add this
  }
}
```

Or import directly:
```typescript
import type { AppRouter } from '../../../api/src/trpc/router';
```

### 2. Auth Token Not Sent

**Problem:** tRPC returns UNAUTHORIZED

**Solution:** Ensure TRPCProvider wraps your app and uses Clerk's `getToken()`

### 3. React Query Not Working

**Problem:** Hooks don't trigger re-renders

**Solution:** Make sure `QueryClientProvider` wraps `trpc.Provider`

---

## 📊 Performance Tips

### 1. Request Batching

tRPC automatically batches multiple requests into one HTTP call:

```typescript
// These 3 queries become 1 HTTP request!
const q1 = trpc.projects.list.useQuery();
const q2 = trpc.projects.get.useQuery({ id: '1' });
const q3 = trpc.projects.get.useQuery({ id: '2' });
```

### 2. Caching

```typescript
// Configure cache time
const { data } = trpc.projects.list.useQuery(undefined, {
  staleTime: 60 * 1000, // Consider fresh for 1 minute
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
});
```

### 3. Suspense Mode

```typescript
// Use with React Suspense
const { data } = trpc.projects.list.useSuspenseQuery();
// No need to check isLoading!
```

---

## 🎉 Benefits Achieved

### Before tRPC (REST API)

❌ Manual typing: `interface Project { ... }`  
❌ API documentation needed  
❌ Runtime errors when API changes  
❌ No autocomplete for API calls  
❌ Tedious error handling  
❌ Manual input validation

### After tRPC

✅ **Automatic typing** - Inferred from backend  
✅ **No documentation needed** - Types are the docs  
✅ **Compile-time errors** - Catch breaking changes instantly  
✅ **Full autocomplete** - IDE knows entire API  
✅ **Built-in error handling** - React Query integration  
✅ **Zod validation** - Type-safe input validation

---

## 🔗 Resources

- **tRPC Docs:** https://trpc.io
- **React Query Docs:** https://tanstack.com/query
- **Zod Docs:** https://zod.dev
- **Example Component:** `apps/web/components/examples/projects-list-trpc.tsx`

---

## 🏁 Next Steps

### Immediate

1. **Test tRPC endpoint:**
   ```bash
   # Start Hono server with tRPC
   cd apps/api && pnpm dev:hono

   # Test from frontend
   cd apps/web && pnpm dev
   ```

2. **Try the example component** to see type safety in action

### Short Term

1. **Migrate remaining routes** (keys, AI)
2. **Update existing components** to use tRPC
3. **Remove REST endpoints** when fully migrated

### Long Term

1. **Add subscriptions** for real-time updates
2. **Implement optimistic updates** for better UX
3. **Add more procedures** as features grow

---

**Status:** tRPC fully integrated! Projects route type-safe from end-to-end. 🎉
