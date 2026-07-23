-- Database Migration: Clerk User IDs
-- This migration prepares your database for Clerk authentication

-- Option 1: Use Clerk IDs as primary keys (recommended for new projects)
-- If starting fresh, modify your users table to use TEXT for id instead of UUID

-- Option 2: Add clerkId mapping (recommended for existing projects)
-- This keeps your existing UUID-based system and maps to Clerk users

BEGIN;

-- Add clerk_id column to users table
ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_users_clerk_id ON users(clerk_id);

-- Optional: Add a trigger to sync user updates
-- This ensures updatedAt is set when clerk_id is added
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

COMMIT;

-- Migration Notes:
-- 1. Run this on your development database first
-- 2. Test the auth flow thoroughly
-- 3. Existing users will need to sign in via Clerk to get their clerk_id set
-- 4. You may want to create a sync script to match users by email

-- Rollback (if needed):
-- DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
-- DROP FUNCTION IF EXISTS update_users_updated_at();
-- DROP INDEX IF EXISTS idx_users_clerk_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS clerk_id;
