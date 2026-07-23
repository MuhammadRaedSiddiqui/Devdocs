// apps/api/src/test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Use test database URL if available
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/\/[^/]+$/, '/devdocs_test');
}

// Use test Redis instance if available
if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('test')) {
  process.env.REDIS_URL = process.env.REDIS_URL + '/1'; // Use Redis database 1 for tests
}

beforeAll(async () => {
  // Run migrations on test DB (if needed)
  // await migrate(db, { migrationsFolder: './drizzle' });
});

afterEach(async () => {
  // Clean up after each test
  // This would delete test data created during the test
  // await db.delete(projects);
  // await db.delete(users);
});

afterAll(async () => {
  // Close connections
  // await db.end();
});
