import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable';

export const pool = new pg.Pool({ connectionString, max: 10 });

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}

export async function one<T = any>(text: string, params?: any[]): Promise<T | null> {
  const r = await pool.query(text, params);
  return (r.rows[0] as T) ?? null;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
