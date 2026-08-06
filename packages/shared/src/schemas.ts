// packages/shared/src/schemas.ts
// Zod schemas for every API request/response shape.
// Used for runtime validation in apps/api routes AND
// for TypeScript types in apps/web fetch helpers — no duplication.
import { z } from "zod";

// ── AI streaming ──────────────────────────────────────────────────────────────
export const StreamRequestSchema = z.object({
  projectId:   z.string().uuid("projectId must be a valid UUID"),
  domainId:    z.enum([
    "planning", "architecture", "database", "api", "environment",
    "auth", "testing", "monitoring", "frontend", "deployment",
  ]),
  userMessage: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
  provider:    z.enum(["anthropic", "openai", "bedrock", "metamuse"]).default("anthropic"),
});

export type StreamRequest = z.infer<typeof StreamRequestSchema>;

// SSE event shapes sent from the server to the browser
export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), text:      z.string() }),
  z.object({ type: z.literal("done"),  text:      z.string() }),
  z.object({ type: z.literal("error"), errorType: z.string(), message: z.string() }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ── Projects ──────────────────────────────────────────────────────────────────
export const ProjectCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  type: z.enum(["saas", "api", "internal_tool", "mobile", "landing_page", "other"]),
});

export const ProjectUpdateSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  status:        z.enum(["in_progress", "complete", "archived"]).optional(),
  interviewData: z.record(z.unknown()).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

// ── API keys ──────────────────────────────────────────────────────────────────
export const ApiKeyUpsertSchema = z.object({
  provider: z.enum(["anthropic", "openai", "metamuse"]),
  key:      z.string().min(10, "Key too short"),
});

export type ApiKeyUpsert = z.infer<typeof ApiKeyUpsertSchema>;

export const ApiKeyResponseSchema = z.object({
  provider:   z.enum(["anthropic", "openai", "metamuse"]),
  maskedKey:  z.string(),
  createdAt:  z.string(),
});

export type ApiKeyResponse = z.infer<typeof ApiKeyResponseSchema>;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const SignInSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const SignUpSchema = SignInSchema.extend({
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path:    ["confirmPassword"],
});

export type SignIn = z.infer<typeof SignInSchema>;
export type SignUp = z.infer<typeof SignUpSchema>;
