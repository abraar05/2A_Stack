import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/pgfile', { recursive: true });
const db = await PGlite.create('/tmp/pgfile');
const s = new PGLiteSocketServer({ db, port: 5434, host: '127.0.0.1' });
await s.start();
console.log('listening on 5434');
