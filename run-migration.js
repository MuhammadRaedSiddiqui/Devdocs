// Quick migration script - run with: node run-migration.js
// Requires: DATABASE_URL in your .env file

require('dotenv').config({ path: './apps/api/.env' });
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Add clerk_id column
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
    `);
    console.log('✓ Added clerk_id column');

    // Add index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
    `);
    console.log('✓ Created index');

    // Add trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_users_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ Created trigger function');

    // Add trigger
    await client.query(`
      DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
      CREATE TRIGGER users_updated_at_trigger
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_users_updated_at();
    `);
    console.log('✓ Created trigger');

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
