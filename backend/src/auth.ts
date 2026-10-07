import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.ts';

const SECRET = process.env.JWT_SECRET || '2a-stack-dev-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '2a-stack-dev-refresh-change-me';

export const ROLES = ['admin', 'management', 'warehouse', 'sales', 'hr', 'accounts', 'delivery', 'customer'] as const;
export type Role = typeof ROLES[number];

export function hashPassword(p: string) { return bcrypt.hashSync(p, 10); }
export function checkPassword(p: string, h: string) { return bcrypt.compareSync(p, h); }

export function signAccess(u: { id: number; role: Role; email: string }) {
  return jwt.sign({ sub: u.id, role: u.role, email: u.email }, SECRET, { expiresIn: '15m' });
}
export function signRefresh(u: { id: number }) {
  return jwt.sign({ sub: u.id, typ: 'refresh' }, REFRESH_SECRET, { expiresIn: '30d' });
}
export function verifyAccess(token: string) {
  return jwt.verify(token, SECRET) as unknown as { sub: number; role: Role; email: string };
}
export function verifyRefresh(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as unknown as { sub: number; typ: string };
}

export function requireAuth(roles?: Role[]) {
  return (req: any, res: any, next: any) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    try {
      const u = verifyAccess(h.slice(7));
      if (roles && !roles.includes(u.role)) return res.status(403).json({ error: 'forbidden' });
      req.user = u;
      next();
    } catch {
      res.status(401).json({ error: 'invalid token' });
    }
  };
}

export async function currentUser(id: number) {
  const r = await query('SELECT id,email,name,role FROM users WHERE id=$1', [id]);
  return r[0] ?? null;
}
