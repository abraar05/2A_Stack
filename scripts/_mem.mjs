import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const db = await PGlite.create();
const s = new PGLiteSocketServer({ db, port: 5433, host: '127.0.0.1' });
await s.start();
console.log('listening on 5433');
