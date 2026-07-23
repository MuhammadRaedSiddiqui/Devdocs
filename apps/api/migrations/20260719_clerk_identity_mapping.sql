-- Clerk identity mapping rollout
--
-- This migration is intentionally additive and safe for databases that may
-- already have pre-Clerk users. Do not make clerk_id NOT NULL until the
-- backfill query below returns zero rows.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique
  ON users (clerk_id)
  WHERE clerk_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS projects_user_id_active_idx
  ON projects (user_id)
  WHERE deleted_at IS NULL;

COMMIT;

-- Operational backfill checklist (run separately, after validating data):
-- 1. Match legacy users to Clerk users by verified email address.
-- 2. Update users.clerk_id for each confirmed match.
-- 3. Confirm: SELECT count(*) FROM users WHERE clerk_id IS NULL;
-- 4. In a later release, add NOT NULL to users.clerk_id if every local user
--    must be Clerk-backed.
