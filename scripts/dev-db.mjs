import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync } from 'node:fs';

const dir = process.argv[2] || new URL('../.data/pg', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const db = await PGlite.create(dir);
const server = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1' });
await server.start();
console.log('PGlite socket server listening on 127.0.0.1:5432 at', dir);
process.on('SIGINT', async () => { await server.stop(); await db.close(); process.exit(0); });
