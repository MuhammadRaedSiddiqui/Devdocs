// One-off: wipe the public schema so drizzle-kit can rebuild it cleanly.
// Run with: NODE_ENV=development npx tsx _wipe.mts
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

// prepare:false for the pgbouncer transaction pooler
const sql = postgres(url, { max: 1, prepare: false });

const before = await sql`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;
console.log('Tables before wipe:', before.map((r) => r.tablename));

await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await sql.unsafe('GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;');

const after = await sql`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;
console.log('Tables after wipe:', after.map((r) => r.tablename));
console.log('WIPE_OK');

await sql.end();
