import { pool, query } from './db.ts';
import { hashPassword } from './auth.ts';

const admin = await query("SELECT id FROM users WHERE email='admin@amayastack.app'");
if (admin.length === 0) {
  await query("INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)",
    ['admin@amayastack.app', hashPassword('Stack@2026'), 'Admin', 'admin']);
  await query("INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)",
    ['hr@amayastack.app', hashPassword('Stack@2026'), 'HR Manager', 'hr']);
  await query("INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)",
    ['warehouse@amayastack.app', hashPassword('Stack@2026'), 'Warehouse Lead', 'warehouse']);
  await query("INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)",
    ['sales@amayastack.app', hashPassword('Stack@2026'), 'Sales Lead', 'sales']);
  await query("INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)",
    ['customer@amayastack.app', hashPassword('Stack@2026'), 'Dealer User', 'customer']);
}

const wh = await query("SELECT id FROM warehouses LIMIT 1");
if (wh.length === 0) {
  await query("INSERT INTO warehouses(name,location,capacity_pct) VALUES('Chattogram HQ','Chattogram',92),('Dhaka Hub','Dhaka',78),('Sylhet Depot','Sylhet',61)");
  await query("INSERT INTO brands(name) VALUES('Xiaomi'),('Samsung'),('Honor'),('Infinix'),('Nokia')");
  const b = await query<{id:number}>("SELECT id FROM brands WHERE name='Xiaomi'");
  const m = await query<{id:number}>("SELECT id FROM models LIMIT 0");
  await query("INSERT INTO models(brand_id,name) VALUES($1,'Redmi 15C'),($1,'Redmi Note 15 4G'),($1,'Redmi 14C')", [b[0].id]);
  const p = await query<{id:number}>("SELECT id FROM products LIMIT 0");
  const models = await query<{id:number,name:string}>("SELECT id,name FROM models");
  for (const md of models) {
    await query("INSERT INTO products(brand_id,model_id,name,storage,ram,colour,region,purchase_cost,selling_price) VALUES($1,$2,$3,'256GB','8GB','Blue','BD',21000,26400)", [b[0].id, md.id, md.name]);
  }
  const p1 = await query<{id:number}>("SELECT id FROM products LIMIT 1");
  const wh1 = await query<{id:number}>("SELECT id FROM warehouses LIMIT 1");
  await query("INSERT INTO imeis(imei1,imei2,serial_no,product_id,warehouse_id,status,selling_price,purchase_cost) VALUES('990001111111111','990001111111112','SN001',$1,$2,'in_stock',26400,21000),('990002222222222',NULL,'SN002',$1,$2,'in_stock',26400,21000),('990003333333333',NULL,'SN003',$1,$2,'reserved',26400,21000)", [p1[0].id, wh1[0].id]);
  await query("INSERT INTO carriers(name,on_time_pct,failure_rate) VALUES('Pathao Logistics',97.2,1.1),('Steadfast',96.4,1.8),('RedX',92.9,3.2)");
  await query("INSERT INTO customers(name,city,tier,credit_limit,outstanding,salesperson,risk) VALUES('Smart Zone BD','Dhaka','Gold',5000000,420000,'Rafi','low'),('Mobile Point','Chattogram','Silver',3000000,1200000,'Nadia','medium'),('Gadget Hub','Dhaka','Silver',1500000,0,'Rafi','low')");
  await query("INSERT INTO employees(full_name,department,position,email,phone,joined_at) VALUES('Mahin Rahman','Sales','Area Sales','mahin@amayastack.app','+8801700000001','2025-01-12'),('Nusrat Jahan','Operations','Ops Lead','nusrat@amayastack.app','+8801700000002','2025-03-01'),('Rafi Ahmed','Sales','Account Exec','rafi@amayastack.app','+8801700000003','2024-11-20')");
  await query("INSERT INTO approvals(kind,subject,status,amount) VALUES('leave','Mahin Rahman — 2 days','pending',NULL),('expense','Nusrat Jahan — BDT 18,400','pending',18400),('payroll','October payroll run','pending',8420000)");
  await query("INSERT INTO tickets(customer_id,subject,body) SELECT id,'Damaged package in TR-92822','Carton arrived with crushed corner on 24 units.' FROM customers LIMIT 1");
  await query("INSERT INTO notifications(user_id,application,kind,title,body) SELECT id,'distro','low_stock','37 SKUs low','Below safety stock across warehouses' FROM users LIMIT 1");
}
console.log('seeded');
await pool.end();
