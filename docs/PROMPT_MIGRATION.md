# DevDocs AI — Migration Prompts
# 6 phases to convert from the current Next.js-only monolith to a proper
# Turborepo monorepo with Express API, Redis, Better Auth, and TanStack Query.
# Paste each prompt into Claude Code in order. Each phase is self-contained
# and deployable — you can stop after any phase and the app still runs.

---

## PHASE 1 — Turborepo monorepo scaffolding

You are working on DevDocs AI. The current project is a Next.js 14 App Router
app at the repo root. You need to restructure it into a Turborepo monorepo
with pnpm workspaces without breaking anything — the Next.js app should work
identically after this phase.

### Task

1. Install Turborepo globally if not already installed: `npm install -g turbo`.
   Use pnpm as the package manager throughout.

2. Create the following directory structure at the repo root:
   ```
   apps/
     web/          ← move existing Next.js app here
     api/          ← empty for now, scaffold in this step
   packages/
     shared/       ← empty for now, scaffold in this step
   ```

3. Move all existing Next.js files into `apps/web/`:
   - `app/`, `components/`, `lib/`, `public/`, `tailwind.config.ts`,
     `next.config.js` (or `.ts`), `postcss.config.js`, `app/globals.css`,
     `app/landing.module.css`, `app/landing.module.css.d.ts`
   - Move `README.md`, `CLAUDE_CODE_PROMPTS.md`, `PROMPT_01_AI_PROVIDERS.md`,
     `PROMPT_MIGRATION.md` to the repo root (not into `apps/web`).

4. Create `apps/web/package.json`:
   ```json
   {
     "name": "@devdocs/web",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "next dev --port 3000",
       "build": "next build",
       "start": "next start",
       "typecheck": "tsc --noEmit"
     },
     "dependencies": {
       "next": "14.2.5",
       "react": "^18.3.1",
       "react-dom": "^18.3.1",
       "zustand": "^4.5.4",
       "clsx": "^2.1.1",
       "tailwind-merge": "^2.5.2",
       "@anthropic-ai/sdk": "^0.27.3",
       "openai": "^4.67.3",
       "@devdocs/shared": "workspace:*"
     },
     "devDependencies": {
       "typescript": "^5.5.4",
       "@types/node": "^20.14.0",
       "@types/react": "^18.3.3",
       "@types/react-dom": "^18.3.0",
       "tailwindcss": "^3.4.7",
       "autoprefixer": "^10.4.20"
     }
   }
   ```

5. Create `apps/api/package.json`:
   ```json
   {
     "name": "@devdocs/api",
     "version": "0.1.0",
     "private": true,
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "typecheck": "tsc --noEmit"
     },
     "dependencies": {
       "express": "^4.19.2",
       "cors": "^2.8.5",
       "helmet": "^7.1.0",
       "compression": "^1.7.4",
       "zod": "^3.23.8",
       "@devdocs/shared": "workspace:*"
     },
     "devDependencies": {
       "typescript": "^5.5.4",
       "@types/node": "^20.14.0",
       "@types/express": "^4.17.21",
       "@types/cors": "^2.8.17",
       "@types/compression": "^1.7.5",
       "tsx": "^4.16.0"
     }
   }
   ```

6. Create `apps/api/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "moduleResolution": "node",
       "outDir": "dist",
       "rootDir": "src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "resolveJsonModule": true,
       "paths": { "@devdocs/shared": ["../../packages/shared/src"] }
     },
     "include": ["src"]
   }
   ```

7. Create `apps/api/src/index.ts` — a minimal Express health check:
   ```ts
   import express from "express";
   import cors from "cors";
   import helmet from "helmet";
   import compression from "compression";

   const app = express();
   const PORT = process.env.PORT ?? 4000;

   app.use(helmet());
   app.use(cors({ origin: process.env.WEB_URL ?? "http://localhost:3000", credentials: true }));
   app.use(compression());
   app.use(express.json());

   app.get("/health", (_req, res) => res.json({ status: "ok", service: "devdocs-api" }));

   app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

   export default app;
   ```

8. Create `packages/shared/package.json`:
   ```json
   {
     "name": "@devdocs/shared",
     "version": "0.1.0",
     "private": true,
     "main": "./src/index.ts",
     "types": "./src/index.ts",
     "scripts": { "typecheck": "tsc --noEmit" },
     "devDependencies": { "typescript": "^5.5.4" }
   }
   ```

9. Create `packages/shared/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020", "module": "esnext",
       "moduleResolution": "bundler", "strict": true,
       "declaration": true, "noEmit": true, "skipLibCheck": true
     },
     "include": ["src"]
   }
   ```

10. Create `packages/shared/src/index.ts` — re-exports everything from the package:
    ```ts
    export * from "./types";
    ```

11. Copy `apps/web/lib/types.ts` to `packages/shared/src/types.ts`.
    Do NOT delete the original yet — phase 2 handles the import cleanup.

12. Create root `pnpm-workspace.yaml`:
    ```yaml
    packages:
      - "apps/*"
      - "packages/*"
    ```

13. Create root `package.json`:
    ```json
    {
      "name": "devdocs-ai",
      "private": true,
      "scripts": {
        "dev": "turbo dev",
        "build": "turbo build",
        "typecheck": "turbo typecheck"
      },
      "devDependencies": {
        "turbo": "^2.0.0"
      }
    }
    ```

14. Create `turbo.json`:
    ```json
    {
      "$schema": "https://turbo.build/schema.json",
      "tasks": {
        "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
        "dev":   { "persistent": true, "cache": false },
        "typecheck": { "dependsOn": ["^typecheck"] }
      }
    }
    ```

15. Update `apps/web/tsconfig.json` to add the shared package path:
    ```json
    {
      "compilerOptions": {
        "paths": {
          "@/*": ["./*"],
          "@devdocs/shared": ["../../packages/shared/src"]
        }
      }
    }
    ```

16. Run `pnpm install` from the repo root to link workspaces.
    Run `pnpm dev` and confirm both `apps/web` (port 3000) and `apps/api`
    (port 4000) start. Confirm `http://localhost:4000/health` returns
    `{ "status": "ok" }`. Confirm the Next.js app at port 3000 is identical
    to before.

Do not modify any component or page logic in this phase. This is pure
scaffolding — the only acceptable changes are directory moves and
config file additions.

---

## PHASE 2 — Shared package: types, schemas, prompt templates

You are working on the DevDocs AI monorepo created in Phase 1.
`packages/shared/src/types.ts` contains the shared TypeScript types.
This phase moves more shared code there and cleans up import paths.

### Task

1. Move `apps/web/lib/ai/systemPrompt.ts` into `packages/shared/src/prompts.ts`.
   Update its imports to use relative paths within the package
   (e.g. `import type { ... } from "./types"`).
   Export it from `packages/shared/src/index.ts`.

2. Create `packages/shared/src/schemas.ts` with Zod schemas for every
   API request/response shape. Install `zod` in `packages/shared`:
   ```ts
   import { z } from "zod";

   export const StreamRequestSchema = z.object({
     projectId:   z.string().uuid(),
     domainId:    z.enum(["planning","architecture","database","api","environment","auth","testing","monitoring","frontend","deployment"]),
     userMessage: z.string().min(1).max(4000),
   });

   export const ProjectCreateSchema = z.object({
     name: z.string().min(1).max(100),
     type: z.enum(["saas","api","internal_tool","mobile","landing_page","other"]),
   });

   export const ProjectUpdateSchema = z.object({
     name:           z.string().min(1).max(100).optional(),
     status:         z.enum(["in_progress","complete","archived"]).optional(),
     interviewData:  z.record(z.unknown()).optional(),
   });

   export type StreamRequest  = z.infer<typeof StreamRequestSchema>;
   export type ProjectCreate  = z.infer<typeof ProjectCreateSchema>;
   export type ProjectUpdate  = z.infer<typeof ProjectUpdateSchema>;
   ```

3. Export schemas from `packages/shared/src/index.ts`.

4. In `apps/web`, update all imports of `@/lib/types` that reference types
   which are now in `@devdocs/shared` to use `@devdocs/shared` instead.
   Specifically: `Project`, `ProjectType`, `DomainId`, `ProjectContext`,
   `ChatMessage`, `SchemaField`, `SchemaTables` and all their re-exports.
   Types that are interview-store-specific (`DomainPhase`, `DomainMode`,
   `DomainDefinition`, `ChoiceOption`) can stay in `apps/web/lib/types.ts`
   — they are not needed by the API.

5. Update `apps/web/lib/ai/systemPrompt.ts` to import from
   `@devdocs/shared` instead of `@/lib/types`. Then delete the file and
   import the prompt builder from `@devdocs/shared` in the store.

6. Add `zod` to `packages/shared/package.json` dependencies.

7. Run `pnpm typecheck` from the repo root. Fix any import errors.
   No runtime behaviour should change.

---

## PHASE 3 — Express API: database, Redis, project CRUD

You are working on the DevDocs AI monorepo. `apps/api` is a minimal
Express server. This phase wires it to PostgreSQL via Drizzle ORM and
Redis via Upstash, and adds the project CRUD endpoints the Next.js
frontend will call in later phases.

### Task

**A. Database — Drizzle ORM**

1. In `apps/api`, install:
   `drizzle-orm`, `drizzle-kit`, `postgres` (the `postgres` npm package,
   not `pg` — Drizzle works best with it).

2. Create `apps/api/src/lib/db.ts`:
   ```ts
   import postgres from "postgres";
   import { drizzle } from "drizzle-orm/postgres-js";
   import * as schema from "../schema";

   const client = postgres(process.env.DATABASE_URL!);
   export const db = drizzle(client, { schema });
   ```

3. Create `apps/api/src/schema.ts` — Drizzle table definitions that match
   the existing Supabase PostgreSQL tables exactly:
   ```ts
   import { pgTable, uuid, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

   export const users = pgTable("users", {
     id:          uuid("id").primaryKey().defaultRandom(),
     email:       text("email").notNull().unique(),
     displayName: text("display_name"),
     createdAt:   timestamp("created_at").defaultNow(),
   });

   export const projects = pgTable("projects", {
     id:            uuid("id").primaryKey().defaultRandom(),
     userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
     name:          text("name").notNull(),
     type:          text("type").notNull(),
     status:        text("status").notNull().default("in_progress"),
     interviewData: jsonb("interview_data"),
     createdAt:     timestamp("created_at").defaultNow(),
     updatedAt:     timestamp("updated_at").defaultNow(),
     deletedAt:     timestamp("deleted_at"),
   });

   export const documentationBundles = pgTable("documentation_bundles", {
     id:        uuid("id").primaryKey().defaultRandom(),
     projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
     domainId:  text("domain_id").notNull(),
     content:   text("content").notNull(),
     createdAt: timestamp("created_at").defaultNow(),
     updatedAt: timestamp("updated_at").defaultNow(),
   });
   ```

4. Create `drizzle.config.ts` in `apps/api`:
   ```ts
   import type { Config } from "drizzle-kit";
   export default { schema: "./src/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL! } } satisfies Config;
   ```

**B. Redis — Upstash**

5. Install `@upstash/redis` in `apps/api`.

6. Create `apps/api/src/lib/redis.ts`:
   ```ts
   import { Redis } from "@upstash/redis";
   export const redis = new Redis({
     url:   process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });
   ```

**C. Rate limit middleware**

7. Create `apps/api/src/middleware/rateLimit.ts`:
   ```ts
   import { Request, Response, NextFunction } from "express";
   import { redis } from "../lib/redis";

   export function rateLimit(maxRequests: number, windowSeconds: number) {
     return async (req: Request, res: Response, next: NextFunction) => {
       const userId = (req as any).userId as string | undefined;
       if (!userId) return next(); // auth middleware handles missing sessions
       const key = `ratelimit:${userId}:${req.path}`;
       const count = await redis.incr(key);
       if (count === 1) await redis.expire(key, windowSeconds);
       if (count > maxRequests) {
         return res.status(429).json({ error: "rate_limit", message: "Too many requests. Try again later." });
       }
       next();
     };
   }
   ```

**D. Project routes**

8. Create `apps/api/src/routes/projects.ts`:
   - `GET /projects` — return all non-deleted projects for `req.userId`,
     ordered by `updated_at desc`. Use Drizzle:
     `db.select().from(projects).where(and(eq(projects.userId, userId), isNull(projects.deletedAt))).orderBy(desc(projects.updatedAt))`.
   - `POST /projects` — validate body with `ProjectCreateSchema` from
     `@devdocs/shared`, insert a new project, return the created row.
   - `PATCH /projects/:id` — validate ownership, validate body with
     `ProjectUpdateSchema`, update the row, return updated row.
   - `DELETE /projects/:id` — validate ownership, soft delete
     (`set({ deletedAt: new Date() })`), return `{ success: true }`.
   - `GET /projects/:id` — return single project by id, validate ownership.

9. Mount the router in `apps/api/src/index.ts`:
   `app.use("/projects", requireAuth, projectsRouter)`.
   `requireAuth` is a stub for now: read `x-user-id` header for testing
   (phase 4 replaces this with real session validation).

**E. Environment variables**

10. Create `apps/api/.env.example`:
    ```
    DATABASE_URL=postgresql://...
    UPSTASH_REDIS_REST_URL=https://...
    UPSTASH_REDIS_REST_TOKEN=...
    WEB_URL=http://localhost:3000
    PORT=4000
    SESSION_SECRET=change-me-32-char-minimum
    ```

11. Add a root `.env.example` that documents both `apps/web` and `apps/api`
    variables in separate sections.

**F. Verify**

12. Run `pnpm dev`. Confirm:
    - `GET http://localhost:4000/health` → `{ status: "ok" }`
    - `GET http://localhost:4000/projects` with header `x-user-id: test-user`
      returns an array (empty is fine).
    - The Next.js app still works exactly as before — it is not yet calling
      the Express API.

---

## PHASE 4 — Better Auth: Google + GitHub OAuth, Redis sessions

You are working on the DevDocs AI monorepo. `apps/api` has Express + Drizzle
+ Redis. This phase replaces Supabase Auth with Better Auth, wires Google and
GitHub OAuth, stores sessions in Redis, and updates the Next.js frontend to
validate sessions against the Express server.

### Task

**A. Install Better Auth in apps/api**

1. Install `better-auth` in `apps/api`.

2. Create `apps/api/src/lib/auth.ts`:
   ```ts
   import { betterAuth } from "better-auth";
   import { drizzleAdapter } from "better-auth/adapters/drizzle";
   import { db } from "./db";
   import * as schema from "../schema";

   export const auth = betterAuth({
     database: drizzleAdapter(db, { provider: "pg", schema }),
     secret:   process.env.SESSION_SECRET!,
     session: {
       cookieName: "devdocs_session",
       expiresIn:  60 * 60 * 24 * 7, // 7 days
     },
     socialProviders: {
       google: {
         clientId:     process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       },
       github: {
         clientId:     process.env.GITHUB_CLIENT_ID!,
         clientSecret: process.env.GITHUB_CLIENT_SECRET!,
       },
     },
     trustedOrigins: [process.env.WEB_URL ?? "http://localhost:3000"],
   });
   ```

3. Mount Better Auth's handler in `apps/api/src/index.ts`:
   ```ts
   import { toNodeHandler } from "better-auth/node";
   import { auth } from "./lib/auth";
   app.all("/auth/*", toNodeHandler(auth));
   ```

4. Replace the stub `requireAuth` middleware with a real session check:
   ```ts
   // apps/api/src/middleware/auth.ts
   import { Request, Response, NextFunction } from "express";
   import { auth } from "../lib/auth";

   export async function requireAuth(req: Request, res: Response, next: NextFunction) {
     const session = await auth.api.getSession({ headers: req.headers as any });
     if (!session?.user) return res.status(401).json({ error: "Unauthorized" });
     (req as any).userId = session.user.id;
     (req as any).user   = session.user;
     next();
   }
   ```

5. Add to `apps/api/.env.example`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   ```

**B. Update apps/web**

6. Install `better-auth/react` in `apps/web`.

7. Create `apps/web/lib/auth-client.ts`:
   ```ts
   import { createAuthClient } from "better-auth/react";
   export const authClient = createAuthClient({
     baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
   });
   export const { signIn, signOut, useSession } = authClient;
   ```

8. Update `apps/web/app/(auth)/login/page.tsx`:
   - Replace the Supabase `signInWithPassword` call with:
     `signIn.email({ email, password, callbackURL: "/dashboard" })`.
   - Replace the Google OAuth button with:
     `signIn.social({ provider: "google", callbackURL: "/dashboard" })`.
   - Replace the GitHub OAuth button with:
     `signIn.social({ provider: "github", callbackURL: "/dashboard" })`.
   - On error: display the error message in the existing terracotta callout
     style below the form.

9. Update `apps/web/app/(auth)/signup/page.tsx`:
   - Wire to `signIn.email` with `callbackURL: "/dashboard"`.
     Better Auth creates the user on first sign-in if email+password is enabled.

10. Update `components/layout/Navbar.tsx`:
    - Replace the sign-out button with `signOut({ callbackURL: "/login" })`.

11. Update `apps/web/middleware.ts`:
    ```ts
    import { NextRequest, NextResponse } from "next/server";

    const PROTECTED = ["/dashboard", "/project", "/settings", "/docs"];
    const AUTH_PAGES = ["/login", "/signup"];

    export async function middleware(req: NextRequest) {
      const { pathname } = req.nextUrl;
      const sessionCookie = req.cookies.get("devdocs_session");

      const isProtected = PROTECTED.some(p => pathname.startsWith(p));
      const isAuthPage  = AUTH_PAGES.some(p => pathname.startsWith(p));

      if (isProtected && !sessionCookie) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (isAuthPage && sessionCookie) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    export const config = {
      matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
    };
    ```
    Note: this is a lightweight cookie-presence check. Better Auth validates
    the session properly on the API side on every authenticated request.

12. Add `NEXT_PUBLIC_API_URL=http://localhost:4000` to `apps/web/.env.local`.

**C. Verify**

13. Run `pnpm dev`. Sign in with Google or GitHub. Confirm the session cookie
    `devdocs_session` is set. Confirm `GET /projects` on the API returns
    projects for the signed-in user. Confirm the Next.js middleware redirects
    unauthenticated requests to `/login`.

---

## PHASE 5 — AI streaming moves server-side (SSE endpoint + API key vault)

You are working on the DevDocs AI monorepo. This phase is the most significant
change: AI streaming moves from the browser (BYOK localStorage) to the Express
server (SSE endpoint, rate-limited, Redis-cached, keys stored encrypted in Postgres).

### Task

**A. API key vault**

1. Add a `userApiKeys` table to `apps/api/src/schema.ts`:
   ```ts
   export const userApiKeys = pgTable("user_api_keys", {
     id:        uuid("id").primaryKey().defaultRandom(),
     userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
     provider:  text("provider").notNull(), // "anthropic" | "openai"
     keyHash:   text("key_hash").notNull(),   // AES-256-GCM encrypted, base64
     maskedKey: text("masked_key").notNull(), // "sk-ant-••••wXyz" — shown in UI
     createdAt: timestamp("created_at").defaultNow(),
   }, t => ({ uniq: unique().on(t.userId, t.provider) }));
   ```

2. Create `apps/api/src/lib/crypto.ts`:
   ```ts
   import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
   const ALGORITHM = "aes-256-gcm";
   const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32-byte hex

   export function encryptKey(plaintext: string): string {
     const iv = randomBytes(12);
     const cipher = createCipheriv(ALGORITHM, KEY, iv);
     const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
     const tag = cipher.getAuthTag();
     return Buffer.concat([iv, tag, encrypted]).toString("base64");
   }

   export function decryptKey(ciphertext: string): string {
     const buf = Buffer.from(ciphertext, "base64");
     const iv  = buf.subarray(0, 12);
     const tag = buf.subarray(12, 28);
     const enc = buf.subarray(28);
     const decipher = createDecipheriv(ALGORITHM, KEY, iv);
     decipher.setAuthTag(tag);
     return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
   }
   ```

3. Create `apps/api/src/routes/keys.ts`:
   - `POST /keys` — validate provider + key (call Anthropic/OpenAI with 1
     token to verify), encrypt with `encryptKey()`, upsert into `userApiKeys`,
     return `{ masked }`.
   - `DELETE /keys/:provider` — delete the key row for this user + provider.
   - `GET /keys` — return `[{ provider, maskedKey, createdAt }]` for this user.
     Never return the real key.

4. Add `ENCRYPTION_KEY` (64 hex chars = 32 bytes) to `apps/api/.env.example`.
   Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**B. SSE streaming endpoint**

5. Install `@anthropic-ai/sdk` and `openai` in `apps/api`.

6. Create `apps/api/src/lib/aiStream.ts` — port of the existing
   `apps/web/lib/ai/stream.ts` but server-side. The function signature stays
   the same: `streamAIResponse(systemPrompt, userMessage, config, callbacks, signal)`.
   The only change is removing `dangerouslyAllowBrowser: true` — it is no longer
   needed because calls are made from the server.

7. Create `apps/api/src/routes/ai.ts` — an SSE endpoint:
   ```ts
   router.post("/stream", requireAuth, rateLimit(100, 3600), async (req, res) => {
     const body = StreamRequestSchema.safeParse(req.body);
     if (!body.success) return res.status(400).json({ error: body.error.flatten() });

     const { projectId, domainId, userMessage } = body.data;
     const userId = (req as any).userId as string;

     // Check project ownership
     const project = await db.query.projects.findFirst({
       where: and(eq(projects.id, projectId), eq(projects.userId, userId))
     });
     if (!project) return res.status(404).json({ error: "Project not found" });

     // Check Redis response cache
     const cacheKey = `ai:${projectId}:${domainId}`;
     const cached = await redis.get<string>(cacheKey);
     if (cached) {
       res.setHeader("Content-Type", "text/event-stream");
       res.setHeader("Cache-Control", "no-cache");
       res.setHeader("X-Accel-Buffering", "no");
       res.write(`data: ${JSON.stringify({ type: "token", text: cached })}\n\n`);
       res.write(`data: ${JSON.stringify({ type: "done", text: cached })}\n\n`);
       return res.end();
     }

     // Load the user's API key
     const keyRow = await db.query.userApiKeys.findFirst({
       where: and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, req.body.provider ?? "anthropic"))
     });
     if (!keyRow) return res.status(400).json({ error: "no_key", message: "No API key found for this provider." });

     const apiKey = decryptKey(keyRow.keyHash);
     const config = { provider: keyRow.provider as AIProvider, apiKey, model: PROVIDER_MODELS[keyRow.provider as AIProvider].default };

     // Build system prompt from project's interview_data
     const interviewData = project.interviewData as any ?? {};
     const systemPrompt = buildSystemPrompt(
       interviewData.lockedContext,
       domainId,
       interviewData.elaboration ?? "",
       interviewData.lockedChoices ?? {}
     );

     // Open SSE
     res.setHeader("Content-Type", "text/event-stream");
     res.setHeader("Cache-Control", "no-cache");
     res.setHeader("X-Accel-Buffering", "no");
     res.flushHeaders();

     const controller = new AbortController();
     req.on("close", () => controller.abort());

     streamAIResponse(systemPrompt, userMessage, config, {
       onToken: (acc) => {
         res.write(`data: ${JSON.stringify({ type: "token", text: acc })}\n\n`);
       },
       onDone: async (full) => {
         await redis.setex(cacheKey, 86400, full); // cache 24h
         res.write(`data: ${JSON.stringify({ type: "done", text: full })}\n\n`);
         res.end();
       },
       onError: (type, message) => {
         res.write(`data: ${JSON.stringify({ type: "error", errorType: type, message })}\n\n`);
         res.end();
       },
     }, controller.signal);
   });
   ```

**C. Update apps/web to consume the SSE endpoint**

8. Create `apps/web/lib/ai/serverStream.ts`:
   ```ts
   export interface ServerStreamCallbacks {
     onToken: (accumulated: string) => void;
     onDone:  (fullText: string) => void;
     onError: (type: string, message: string) => void;
   }

   export async function streamFromServer(
     projectId:   string,
     domainId:    string,
     userMessage: string,
     provider:    string,
     callbacks:   ServerStreamCallbacks,
     signal?:     AbortSignal
   ): Promise<void> {
     const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
     const res = await fetch(`${apiUrl}/ai/stream`, {
       method:      "POST",
       headers:     { "Content-Type": "application/json" },
       credentials: "include", // sends the session cookie
       body:        JSON.stringify({ projectId, domainId, userMessage, provider }),
       signal,
     });

     if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       callbacks.onError(err.error ?? "unknown", err.message ?? "Request failed");
       return;
     }

     const reader = res.body!.getReader();
     const decoder = new TextDecoder();
     let buffer = "";

     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       buffer += decoder.decode(value, { stream: true });
       const lines = buffer.split("\n\n");
       buffer = lines.pop() ?? "";
       for (const line of lines) {
         if (!line.startsWith("data: ")) continue;
         const data = JSON.parse(line.slice(6));
         if (data.type === "token") callbacks.onToken(data.text);
         if (data.type === "done")  { callbacks.onDone(data.text); return; }
         if (data.type === "error") { callbacks.onError(data.errorType, data.message); return; }
       }
     }
   }
   ```

9. Update `apps/web/lib/interview/store.ts`:
   - Import `streamFromServer` from `./ai/serverStream` instead of the SDK-level
     `streamAIResponse` from `./ai/stream`.
   - In `runReply()`, replace the `streamAIResponse` call with `streamFromServer`.
     Pass `store.projectId`, the current domain id, the user message, and
     `store.currentProvider`.
   - The `onToken`, `onDone`, and `onError` callbacks are identical — no other
     store logic changes.
   - Delete the `getActiveConfig()` call from `runReply()` — the server reads
     the key from Postgres. The store no longer needs to know about keys.

10. Update `components/settings/ApiKeySection.tsx`:
    - Remove all `localStorage` read/write calls.
    - Replace `verifyProviderKey()` with a `POST /keys` call to the Express API.
    - On success, the API returns `{ masked }` — update the component state with
      the masked key from the server.
    - `handleRemove()` calls `DELETE /keys/:provider`.
    - On mount, `GET /keys` to load current key status instead of reading localStorage.

**D. Add NEXT_PUBLIC_API_URL to apps/web**

11. Add `NEXT_PUBLIC_API_URL=http://localhost:4000` to `apps/web/.env.local`.
    Add `NEXT_PUBLIC_API_URL=https://api.devdocs.ai` to the Vercel environment.

**E. Verify**

12. Run `pnpm dev`. Start an interview. Confirm network requests show
    `POST http://localhost:4000/ai/stream` returning `text/event-stream`.
    Confirm that running the same domain twice returns the cached response
    (check Redis with `redis-cli KEYS "ai:*"`). Confirm no API key appears
    in browser localStorage or network headers.

---

## PHASE 6 — TanStack Query: server state, optimistic updates, loading skeletons

You are working on the DevDocs AI monorepo. The Express API is running and
authenticated. This phase replaces all `useEffect` + raw `fetch` patterns in
`apps/web` with TanStack Query hooks, adds optimistic updates for mutations,
and adds loading skeletons.

### Task

**A. Setup**

1. Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
   in `apps/web`.

2. Create `apps/web/lib/query/client.ts`:
   ```ts
   import { QueryClient } from "@tanstack/react-query";
   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 1000 * 60,        // 1 minute
         refetchOnWindowFocus: false,
         retry: 1,
       },
     },
   });
   ```

3. Create `apps/web/app/providers.tsx`:
   ```tsx
   "use client";
   import { QueryClientProvider } from "@tanstack/react-query";
   import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
   import { queryClient } from "@/lib/query/client";
   export function Providers({ children }: { children: React.ReactNode }) {
     return (
       <QueryClientProvider client={queryClient}>
         {children}
         {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
       </QueryClientProvider>
     );
   }
   ```

4. Wrap `apps/web/app/layout.tsx` children with `<Providers>`.

**B. API fetch helpers**

5. Create `apps/web/lib/query/api.ts`:
   ```ts
   const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

   async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
     const res = await fetch(`${BASE}${path}`, {
       ...init,
       credentials: "include",
       headers: { "Content-Type": "application/json", ...init?.headers },
     });
     if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       throw new Error(err.message ?? `API error ${res.status}`);
     }
     return res.json();
   }

   export const api = {
     projects: {
       list:   ()           => apiFetch<Project[]>("/projects"),
       get:    (id: string) => apiFetch<Project>(`/projects/${id}`),
       create: (body: ProjectCreate) =>
         apiFetch<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
       update: (id: string, body: ProjectUpdate) =>
         apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
       delete: (id: string) =>
         apiFetch<{ success: boolean }>(`/projects/${id}`, { method: "DELETE" }),
     },
   };
   ```

**C. Query hooks**

6. Create `apps/web/lib/query/hooks.ts`:
   ```ts
   import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
   import { api } from "./api";
   import type { Project, ProjectCreate, ProjectUpdate } from "@devdocs/shared";

   export const keys = {
     projects:    ["projects"] as const,
     project:     (id: string) => ["projects", id] as const,
   };

   export function useProjects() {
     return useQuery({ queryKey: keys.projects, queryFn: api.projects.list });
   }

   export function useProject(id: string) {
     return useQuery({ queryKey: keys.project(id), queryFn: () => api.projects.get(id) });
   }

   export function useCreateProject() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (body: ProjectCreate) => api.projects.create(body),
       onSuccess:  () => qc.invalidateQueries({ queryKey: keys.projects }),
     });
   }

   export function useDeleteProject() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: (id: string) => api.projects.delete(id),
       onMutate: async (id) => {
         await qc.cancelQueries({ queryKey: keys.projects });
         const prev = qc.getQueryData<Project[]>(keys.projects);
         qc.setQueryData<Project[]>(keys.projects, old => old?.filter(p => p.id !== id) ?? []);
         return { prev };
       },
       onError: (_err, _id, ctx) => {
         if (ctx?.prev) qc.setQueryData(keys.projects, ctx.prev);
       },
       onSettled: () => qc.invalidateQueries({ queryKey: keys.projects }),
     });
   }
   ```

**D. Update dashboard page**

7. Update `apps/web/app/(app)/dashboard/page.tsx`:
   - Remove `useState<Project[]>(MOCK_PROJECTS)`.
   - Replace with `const { data: projects = [], isLoading } = useProjects()`.
   - Replace `handleDelete` with the `useDeleteProject` mutation.
     The optimistic update in `onMutate` makes the card disappear instantly
     without waiting for the server.
   - Replace `handleCreate` with the `useCreateProject` mutation.
     On success, navigate to `/project/${newProject.id}/interview`.
   - While `isLoading`: render 4 skeleton project cards:
     ```tsx
     function SkeletonCard() {
       return (
         <div className="bg-white border border-vellum-border rounded-vellum overflow-hidden animate-pulse">
           <div className="p-4 pb-3.5 border-b border-vellum-border-light">
             <div className="h-4 bg-vellum-border rounded w-20 mb-2.5"/>
             <div className="h-4 bg-vellum-border rounded w-3/4 mb-1.5"/>
             <div className="h-3 bg-vellum-border-light rounded w-full mb-1"/>
             <div className="h-3 bg-vellum-border-light rounded w-2/3"/>
           </div>
           <div className="px-4 py-3 bg-vellum flex items-center justify-between">
             <div className="h-2 bg-vellum-border rounded flex-1 mr-4"/>
             <div className="h-3 bg-vellum-border rounded w-16"/>
           </div>
         </div>
       );
     }
     ```

**E. Update interview page**

8. Update `apps/web/app/(app)/project/[id]/interview/page.tsx`:
   - Replace `MOCK_PROJECTS.find(...)` with `useProject(params.id)`.
   - While loading, render `<InterviewSkeleton />` (see below).
   - On error (project not found), redirect to `/dashboard`.
   - If the fetched project has `interview_data?.lockedContext`, call
     `store.resumeFromSaved(project.interview_data)` instead of showing
     the DiscoveryForm.

9. Create `apps/web/components/interview/InterviewSkeleton.tsx`:
   ```tsx
   export function InterviewSkeleton() {
     return (
       <div className="flex h-[calc(100vh-52px)] overflow-hidden animate-pulse">
         <div className="w-[200px] border-r border-vellum-border bg-vellum p-4">
           <div className="h-1 bg-vellum-border rounded mb-4"/>
           {Array.from({length:10}).map((_,i) => (
             <div key={i} className="flex items-center gap-2 py-2.5 px-2">
               <div className="w-4 h-4 rounded-full bg-vellum-border flex-shrink-0"/>
               <div className={`h-3 bg-vellum-border rounded`} style={{width:`${55+i%3*15}%`}}/>
             </div>
           ))}
         </div>
         <div className="flex-1 flex flex-col">
           <div className="h-10 border-b border-vellum-border bg-vellum flex items-center px-5 gap-3">
             <div className="h-3 w-16 bg-vellum-border rounded"/>
             <div className="h-3 w-24 bg-vellum-border rounded"/>
           </div>
           <div className="flex-1 px-5 py-4 flex flex-col gap-3">
             {[80,55,70].map((w,i) => (
               <div key={i} className={`flex gap-2.5 ${i===1?"flex-row-reverse":""}`}>
                 <div className="w-6 h-6 rounded-full bg-vellum-border flex-shrink-0"/>
                 <div className="h-10 bg-vellum-border rounded-vellum" style={{width:`${w}%`}}/>
               </div>
             ))}
           </div>
         </div>
       </div>
     );
   }
   ```

**F. Update docs page**

10. Add a `useQuery` for documentation bundles in `apps/web/lib/query/hooks.ts`:
    ```ts
    export function useLibraryDocs() {
      return useQuery({ queryKey: ["docs"], queryFn: () => api.docs.list() });
    }
    ```
    And a corresponding `api.docs.list()` helper that calls
    `GET /docs` on the Express API — which joins `projects` +
    `documentation_bundles` for the current user.

11. Update `apps/web/app/(app)/docs/page.tsx`:
    - Replace `const DOCS = buildLibraryDocs()` with
      `const { data: DOCS = [] } = useLibraryDocs()`.
    - Add a loading state: while loading, show a skeleton doc list
      (10 rows, each a `h-[64px] bg-vellum-border-light animate-pulse rounded` block).

**G. Verify**

12. Run `pnpm dev`. Confirm:
    - Dashboard loads project cards from the API with a skeleton while loading.
    - Deleting a project removes the card immediately (optimistic), then re-fetches.
    - Creating a project via the modal POSTs to the API and navigates to the
      interview page.
    - Refreshing mid-interview loads `interview_data` from the API and resumes.
    - ReactQueryDevtools panel appears in development at the bottom of the screen.
    - No `useEffect` + raw `fetch` patterns remain in `dashboard/page.tsx`,
      `docs/page.tsx`, or `project/[id]/interview/page.tsx`.

---

## DEPLOYMENT CHECKLIST (after all 6 phases)

### apps/web → Vercel
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### apps/api → Railway or Fly.io
```
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SESSION_SECRET=<32+ random chars>
ENCRYPTION_KEY=<64 hex chars>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
WEB_URL=https://yourdomain.com
PORT=4000
```

### OAuth callback URLs to register
- Google Cloud Console:
  `https://api.yourdomain.com/auth/callback/google`
- GitHub OAuth App:
  `https://api.yourdomain.com/auth/callback/github`

### Upstash Redis
- Create a Redis database at upstash.com (serverless, free tier works).
- Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from dashboard.

### CI (GitHub Actions)
Add `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm typecheck
```
