import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { auth } from './routes/auth.ts';
import { data } from './routes/data.ts';
import { pool } from './db.ts';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', rateLimit({ windowMs: 60_000, max: 30 }));
app.use('/auth', auth);
app.use('/', data);
app.get('/health', (_req, res) => res.json({ ok: true, service: '2a-stack-backend', time: new Date().toISOString() }));

const http = createServer(app);
const io = new Server(http, { cors: { origin: '*' } });
app.set('io', io);
io.on('connection', (s) => s.emit('hello', { app: '2a-stack', at: new Date().toISOString() }));

const port = Number(process.env.PORT || 8080);
http.listen(port, () => console.log(`2A_Stack backend listening on :${port}`));

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
