// apps/api/src/schema.ts
// Drizzle table definitions that match the existing Supabase PostgreSQL tables.
// Run `pnpm drizzle-kit push` to sync these to the database without writing
// manual SQL migrations during development.
import {
  pgTable, uuid, text, timestamp, jsonb, unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:          uuid("id").primaryKey().defaultRandom(),
  // Clerk owns authentication. This maps its stable string user ID to our
  // existing UUID foreign-key model without changing every related table.
  // This remains nullable during the migration period so legacy users can be
  // linked on their first Clerk-authenticated request. A later migration can
  // enforce NOT NULL after the backfill is complete.
  clerkId:     text("clerk_id").unique(),
  email:       text("email").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl:   text("avatar_url"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


export const projects = pgTable("projects", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  type:          text("type").notNull(),
  status:        text("status").notNull().default("in_progress"),
  description:   text("description").default(""),
  interviewData: jsonb("interview_data"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt:     timestamp("deleted_at", { withTimezone: true }),
});

export const documentationBundles = pgTable("documentation_bundles", {
  id:        uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  domainId:  text("domain_id").notNull(),
  content:   text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, t => ({ uniq: unique().on(t.projectId, t.domainId) }));

export const userApiKeys = pgTable("user_api_keys", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider:  text("provider").notNull(),   // "anthropic" | "openai"
  keyHash:   text("key_hash").notNull(),   // AES-256-GCM encrypted, base64
  maskedKey: text("masked_key").notNull(), // shown in the settings UI
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, t => ({ uniq: unique().on(t.userId, t.provider) }));
