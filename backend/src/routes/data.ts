import { Router } from 'express';
import { z } from 'zod';
import { query, tx } from '../db.ts';
import { requireAuth } from '../auth.ts';

export const data = Router();
data.use(requireAuth());

function emit(req: any, type: string, payload: any) {
  req.app.get('io')?.emit('event', { type, payload, at: new Date().toISOString() });
}

/* ---- customers ---- */
data.get('/customers', async (_req, res) => res.json(await query('SELECT * FROM customers ORDER BY id DESC')));
data.post('/customers', requireAuth(['admin', 'sales', 'management']), async (req, res) => {
  const b = z.object({ name: z.string(), city: z.string().optional(), tier: z.string().optional(), credit_limit: z.number().optional(), salesperson: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('INSERT INTO customers(name,city,tier,credit_limit,salesperson) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [b.data.name, b.data.city ?? null, b.data.tier ?? 'Silver', b.data.credit_limit ?? 0, b.data.salesperson ?? null]);
  emit(req, 'customer.updated', r[0]); res.json(r[0]);
});
data.patch('/customers/:id', requireAuth(['admin', 'sales', 'management']), async (req, res) => {
  const b = z.object({ name: z.string().optional(), tier: z.string().optional(), credit_limit: z.number().optional(), outstanding: z.number().optional(), risk: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const sets = Object.keys(b.data).map((k, i) => `${k}=$${i + 2}`).join(',');
  if (!sets) return res.status(400).json({ error: 'nothing' });
  const r = await query(`UPDATE customers SET ${sets} WHERE id=$1 RETURNING *`, [req.params.id, ...Object.values(b.data)]);
  emit(req, 'customer.updated', r[0]); res.json(r[0]);
});

/* ---- warehouses & products (shared entities) ---- */
data.get('/warehouses', async (_req, res) => res.json(await query('SELECT * FROM warehouses ORDER BY id')));
data.post('/warehouses', requireAuth(['admin', 'management']), async (req, res) => {
  const b = z.object({ name: z.string(), location: z.string().optional(), capacity_pct: z.number().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('INSERT INTO warehouses(name,location,capacity_pct) VALUES($1,$2,$3) RETURNING *', [b.data.name, b.data.location ?? null, b.data.capacity_pct ?? 0]);
  emit(req, 'warehouse.created', r[0]); res.json(r[0]);
});
data.get('/products', async (_req, res) => res.json(await query('SELECT p.*,b.name AS brand,m.name AS model FROM products p JOIN brands b ON b.id=p.brand_id JOIN models m ON m.id=p.model_id ORDER BY p.id')));

/* ---- IMEI-centric inventory ---- */
data.get('/imeis', async (req, res) => {
  const { status, warehouse_id, q } = req.query as any;
  let sql = `SELECT i.*,p.name AS product,b.name AS brand,w.name AS warehouse FROM imeis i
    LEFT JOIN products p ON p.id=i.product_id LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN warehouses w ON w.id=i.warehouse_id WHERE true`;
  const params: any[] = [];
  if (status) { params.push(status); sql += ` AND i.status=$${params.length}`; }
  if (warehouse_id) { params.push(warehouse_id); sql += ` AND i.warehouse_id=$${params.length}`; }
  if (q) { params.push(`%${q}%`); sql += ` AND (i.imei1 ILIKE $${params.length} OR i.serial_no ILIKE $${params.length})`; }
  res.json(await query(sql + ' ORDER BY i.id DESC LIMIT 200', params));
});
data.post('/imeis', requireAuth(['admin', 'warehouse', 'management']), async (req, res) => {
  const b = z.object({ imei1: z.string().min(6), serial_no: z.string().optional(), product_id: z.number().optional(), warehouse_id: z.number().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('INSERT INTO imeis(imei1,serial_no,product_id,warehouse_id) VALUES($1,$2,$3,$4) RETURNING *',
    [b.data.imei1, b.data.serial_no ?? null, b.data.product_id ?? null, b.data.warehouse_id ?? null]);
  emit(req, 'inventory.updated', r[0]); res.json(r[0]);
});

const IMEI_ACTIONS: Record<string, string> = { reserve: 'reserved', sell: 'sold', transfer: 'in_transit', receive: 'in_stock', return: 'returned', repair: 'in_repair', adjust: 'adjusted' };
data.post('/imeis/:id/action', requireAuth(['admin', 'warehouse', 'sales', 'management']), async (req: any, res) => {
  const b = z.object({ action: z.enum(['reserve', 'sell', 'transfer', 'receive', 'return', 'repair', 'adjust']), reference: z.string().optional(), location: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  try {
    const out = await tx(async (c) => {
      const cur = await c.query('SELECT * FROM imeis WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (cur.rows.length === 0) throw new Error('not found');
      const prev = cur.rows[0];
      const next = IMEI_ACTIONS[b.data.action];
      await c.query('UPDATE imeis SET status=$1 WHERE id=$2', [next, prev.id]);
      await c.query('INSERT INTO imei_events(imei_id,user_id,action,reference,previous_state,new_state,location) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [prev.id, req.user.sub, b.data.action, b.data.reference ?? null, prev.status, next, b.data.location ?? null]);
      return { ...prev, status: next };
    });
    emit(req, 'inventory.updated', out);
    res.json(out);
  } catch (e: any) {
    res.status(e.message === 'not found' ? 404 : 409).json({ error: e.message === 'not found' ? 'not found' : 'conflict' });
  }
});

data.get('/imeis/:id/history', async (req, res) => {
  res.json(await query('SELECT e.*,u.name AS actor FROM imei_events e LEFT JOIN users u ON u.id=e.user_id WHERE e.imei_id=$1 ORDER BY e.created_at', [req.params.id]));
});

/* ---- orders ---- */
const ORDER_FLOW = ['draft', 'confirmed', 'reserved', 'picking', 'packed', 'dispatched', 'delivered', 'completed', 'cancelled', 'returned'];
data.get('/orders', async (_req, res) => res.json(await query('SELECT o.*,c.name AS customer FROM orders o LEFT JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC')));
data.post('/orders', requireAuth(['admin', 'sales', 'customer', 'management']), async (req: any, res) => {
  const b = z.object({ customer_id: z.number(), items: z.array(z.object({ product_id: z.number(), qty: z.number().min(1), unit_price: z.number() })).min(1), notes: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const total = b.data.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const orderNo = 'SO-' + Date.now().toString().slice(-6);
  const o = await query('INSERT INTO orders(order_no,customer_id,total,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [orderNo, b.data.customer_id, total, b.data.notes ?? null, req.user.sub]);
  for (const it of b.data.items) await query('INSERT INTO order_items(order_id,product_id,qty,unit_price) VALUES($1,$2,$3,$4)', [o[0].id, it.product_id, it.qty, it.unit_price]);
  emit(req, 'order.created', o[0]); res.json(o[0]);
});
data.patch('/orders/:id/status', requireAuth(['admin', 'sales', 'warehouse', 'delivery', 'management']), async (req, res) => {
  const b = z.object({ status: z.string().refine(v => ORDER_FLOW.includes(v), 'invalid status') }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid status' });
  const r = await query('UPDATE orders SET status=$1,updated_at=now() WHERE id=$2 RETURNING *', [b.data.status, req.params.id]);
  emit(req, 'order.updated', r[0]); res.json(r[0]);
});

/* ---- payments / invoices ---- */
data.post('/payments', requireAuth(['admin', 'accounts', 'customer']), async (req, res) => {
  const b = z.object({ customer_id: z.number(), order_id: z.number().optional(), amount: z.number().positive(), method: z.enum(['cash', 'bank', 'bkash', 'nagad', 'card', 'cheque', 'credit', 'cod']) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const p = await query('INSERT INTO payments(customer_id,order_id,amount,method) VALUES($1,$2,$3,$4) RETURNING *', [b.data.customer_id, b.data.order_id ?? null, b.data.amount, b.data.method]);
  await query('UPDATE customers SET outstanding=GREATEST(outstanding-$1,0) WHERE id=$2', [b.data.amount, b.data.customer_id]);
  emit(req, 'payment.created', p[0]); res.json(p[0]);
});
data.get('/payments', async (_req, res) => res.json(await query('SELECT * FROM payments ORDER BY id DESC LIMIT 100')));
data.get('/invoices', async (_req, res) => res.json(await query('SELECT * FROM invoices ORDER BY id DESC LIMIT 100')));

/* ---- employees / HR ---- */
data.get('/employees', requireAuth(['admin', 'hr', 'management']), async (_req, res) => res.json(await query('SELECT * FROM employees ORDER BY id')));
data.post('/employees', requireAuth(['admin', 'hr']), async (req, res) => {
  const b = z.object({ full_name: z.string(), department: z.string().optional(), position: z.string().optional(), email: z.string().email().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('INSERT INTO employees(full_name,department,position,email) VALUES($1,$2,$3,$4) RETURNING *', [b.data.full_name, b.data.department ?? null, b.data.position ?? null, b.data.email ?? null]);
  emit(req, 'employee.updated', r[0]); res.json(r[0]);
});
data.get('/approvals', async (_req, res) => res.json(await query('SELECT * FROM approvals ORDER BY id DESC')));
data.patch('/approvals/:id', requireAuth(['admin', 'hr', 'management']), async (req, res) => {
  const b = z.object({ status: z.enum(['pending', 'approved', 'rejected']) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('UPDATE approvals SET status=$1 WHERE id=$2 RETURNING *', [b.data.status, req.params.id]);
  emit(req, 'approval.updated', r[0]); res.json(r[0]);
});

/* ---- logistics ---- */
data.get('/warehouses/:id/shipments', async (req, res) => res.json(await query('SELECT * FROM shipments WHERE source_warehouse_id=$1 ORDER BY id DESC', [req.params.id])));
data.get('/shipments', async (_req, res) => res.json(await query('SELECT s.*,c.name AS carrier,o.order_no FROM shipments s LEFT JOIN carriers c ON c.id=s.carrier_id LEFT JOIN orders o ON o.id=s.order_id ORDER BY s.id DESC')));
data.post('/shipments', requireAuth(['admin', 'delivery', 'warehouse', 'management']), async (req, res) => {
  const b = z.object({ order_id: z.number().optional(), source_warehouse_id: z.number().optional(), destination: z.string().optional(), carrier_id: z.number().optional(), eta: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const no = 'TR-' + Date.now().toString().slice(-6);
  const s = await query('INSERT INTO shipments(shipment_no,order_id,source_warehouse_id,destination,carrier_id,eta) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [no, b.data.order_id ?? null, b.data.source_warehouse_id ?? null, b.data.destination ?? null, b.data.carrier_id ?? null, b.data.eta ?? null]);
  emit(req, 'shipment.updated', s[0]); res.json(s[0]);
});
data.patch('/shipments/:id/status', requireAuth(['admin', 'delivery', 'warehouse', 'management']), async (req, res) => {
  const b = z.object({ status: z.enum(['picked', 'packed', 'in_transit', 'delivered', 'exception']) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('UPDATE shipments SET status=$1, arrived_at=CASE WHEN $1=\'delivered\' THEN now() ELSE arrived_at END WHERE id=$2 RETURNING *', [b.data.status, req.params.id]);
  emit(req, 'shipment.updated', r[0]); res.json(r[0]);
});
data.get('/carriers', async (_req, res) => res.json(await query('SELECT * FROM carriers ORDER BY id')));
data.get('/exceptions', async (_req, res) => res.json(await query('SELECT e.*,s.shipment_no FROM exceptions e LEFT JOIN shipments s ON s.id=e.shipment_id ORDER BY e.id DESC')));
data.post('/exceptions', requireAuth(['admin', 'delivery', 'warehouse']), async (req, res) => {
  const b = z.object({ shipment_id: z.number().optional(), kind: z.string(), severity: z.enum(['low', 'medium', 'high', 'critical']).optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('INSERT INTO exceptions(shipment_id,kind,severity) VALUES($1,$2,$3) RETURNING *', [b.data.shipment_id ?? null, b.data.kind, b.data.severity ?? 'medium']);
  emit(req, 'notification.created', { kind: 'exception', ...r[0] }); res.json(r[0]);
});

/* ---- support ---- */
data.get('/tickets', async (_req, res) => res.json(await query('SELECT * FROM tickets ORDER BY id DESC')));
data.post('/tickets', async (req: any, res) => {
  const b = z.object({ customer_id: z.number().optional(), subject: z.string(), body: z.string() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const t = await query('INSERT INTO tickets(customer_id,subject,body) VALUES($1,$2,$3) RETURNING *', [b.data.customer_id ?? null, b.data.subject, b.data.body]);
  emit(req, 'ticket.updated', t[0]); res.json(t[0]);
});
data.patch('/tickets/:id', requireAuth(['admin', 'management']), async (req, res) => {
  const b = z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'closed']) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const r = await query('UPDATE tickets SET status=$1 WHERE id=$2 RETURNING *', [b.data.status, req.params.id]);
  emit(req, 'ticket.updated', r[0]); res.json(r[0]);
});

/* ---- notifications ---- */
data.get('/notifications', async (req: any, res) => res.json(await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [req.user.sub])));

/* ---- copilot ---- */
data.post('/ai/query', async (req: any, res) => {
  const b = z.object({ prompt: z.string(), application: z.string().optional() }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'invalid' });
  const p = b.data.prompt.toLowerCase();
  let response: string;
  if (p.includes('reorder') || p.includes('stock')) {
    const low = await query("SELECT count(*)::int AS c FROM imeis WHERE status='in_stock'");
    response = `Current real stock: ${low[0].c} devices marked in_stock. 12 occurrences undated. Review low-stock SKUs in Distro and confirm inbound POs.`;
  } else if (p.includes('risk') || p.includes('overdue') || p.includes('churn')) {
    const r = await query("SELECT name,outstanding,risk FROM customers WHERE risk IN ('medium','high') ORDER BY outstanding DESC LIMIT 5");
    response = 'At-risk accounts: ' + (r.map((x: any) => `${x.name} (outstanding BDT ${x.outstanding}, risk ${x.risk})`).join('; ') || 'none flagged') + '.';
  } else if (p.includes('lane') || p.includes('shipment') || p.includes('carrier')) {
    const c = await query('SELECT name,on_time_pct,failure_rate FROM carriers ORDER BY failure_rate DESC');
    response = 'Carriers by failure rate: ' + c.map((x: any) => `${x.name} ${x.failure_rate}% fail / ${x.on_time_pct}% on-time`).join('; ') + '.';
  } else {
    const o = await query("SELECT status,count(*)::int AS c FROM orders GROUP BY status");
    response = 'Order ledger: ' + o.map((x: any) => `${x.status}: ${x.c}`).join(', ') + '.';
  }
  await query('INSERT INTO ai_queries(user_id,application,prompt,response) VALUES($1,$2,$3,$4)', [req.user.sub, b.data.application ?? 'distro', b.data.prompt, response]);
  res.json({ response });
});
