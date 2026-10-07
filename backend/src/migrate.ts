import { readFileSync, readdirSync } from 'node:fs';
import { pool } from './db.ts';

const dir = new URL('../../database/migrations/', import.meta.url).pathname;
for (const f of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
  console.log('applying', f);
  await pool.query(readFileSync(dir + f, 'utf8'));
}
console.log('migrations applied');
await pool.end();
