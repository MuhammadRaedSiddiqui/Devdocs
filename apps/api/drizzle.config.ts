// apps/api/drizzle.config.ts
// Used by `pnpm drizzle-kit push` (dev) and `pnpm drizzle-kit generate` (prod).
import type { Config } from "drizzle-kit";

export default {
  schema:      "./src/schema.ts",
  out:         "./drizzle",
  dialect:     "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose mode — shows every SQL statement run during migrations
  verbose: true,
  strict:  true,
} satisfies Config;
