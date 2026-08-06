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
  provider:  text("provider").notNull(),   // "anthropic" | "openai" | "metamuse"
  keyHash:   text("key_hash").notNull(),
  maskedKey: text("masked_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, t => ({ uniq: unique().on(t.userId, t.provider) }));

export const interviewSessions = pgTable("interview_sessions", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  projectId:            uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId:               uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt:            timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt:              timestamp("ended_at", { withTimezone: true }),
  totalMessages:        text("total_messages").default("0"),
  totalDomainsCompleted: text("total_domains_completed").default("0"),
  primaryProvider:      text("primary_provider"),  // Most used provider in session
  isComplete:           text("is_complete").default("false"),
  metadata:             jsonb("metadata"),         // Session-level data: project type, active domains, etc.
});

export const interviewMessages = pgTable("interview_messages", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  sessionId:           uuid("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  role:                text("role").notNull(),     // "user" | "assistant"
  content:             text("content").notNull(),
  domainId:            text("domain_id").notNull(),
  provider:            text("provider"),           // AI provider used for this response (null for user messages)
  timestamp:           timestamp("timestamp", { withTimezone: true }).defaultNow(),
  thinkingDurationMs:  text("thinking_duration_ms"),   // Time in "thinking" state
  streamingDurationMs: text("streaming_duration_ms"),  // Time spent streaming
  totalDurationMs:     text("total_duration_ms"),      // Total time from request to completion
  tokensUsed:          text("tokens_used"),            // Tokens from provider (if available)
  errorType:           text("error_type"),             // Error type if failed
  metadata:            jsonb("metadata"),              // Card choices, schema actions, etc.
});
