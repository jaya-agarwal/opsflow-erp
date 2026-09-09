import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db';

async function main() {
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('OpsFlow database schema initialized successfully.');
  await pool.end();
}

main().catch(error => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});
