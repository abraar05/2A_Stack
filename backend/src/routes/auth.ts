import { Router } from 'express';
import { z } from 'zod';
import { query, pool } from '../db.ts';
import { hashPassword, checkPassword, signAccess, signRefresh, verifyRefresh, requireAuth, currentUser } from '../auth.ts';

export const auth = Router();

auth.post('/login', async (req, res) => {
  const b = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid body' });
  const r = await query('SELECT * FROM users WHERE email=$1', [b.data.email.toLowerCase()]);
  const u = r[0];
  if (!u || !checkPassword(b.data.password, u.password_hash)) return res.status(401).json({ error: 'bad credentials' });
  await query('UPDATE users SET last_signin=now() WHERE id=$1', [u.id]);
  const access = signAccess({ id: u.id, role: u.role, email: u.email });
  const refresh = signRefresh({ id: u.id });
  await pool.query('INSERT INTO refresh_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval \'30 days\')', [u.id, refresh.split('.')[2]]);
  res.json({ token: access, refreshToken: refresh, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
});

auth.post('/refresh', async (req, res) => {
  try {
    const p = verifyRefresh(req.body.refreshToken);
    const u = await currentUser(p.sub);
    if (!u) return res.status(401).json({ error: 'no user' });
    res.json({ token: signAccess({ id: u.id, role: u.role as any, email: u.email }) });
  } catch { res.status(401).json({ error: 'bad refresh token' }); }
});

auth.get('/me', requireAuth(), async (req: any, res) => {
  res.json(await currentUser(req.user.sub));
});

auth.post('/register', requireAuth(['admin']), async (req, res) => {
  const b = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string(), role: z.enum(['admin','management','warehouse','sales','hr','accounts','delivery','customer']) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid body' });
  const u = await query('INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4) RETURNING id,email,name,role',
    [b.data.email.toLowerCase(), hashPassword(b.data.password), b.data.name, b.data.role]);
  res.json(u[0]);
});
