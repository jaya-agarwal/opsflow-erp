import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './db';

async function initializeSchema() {
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema ready.');
}

async function seed() {
  await initializeSchema();
  await withTransaction(async client => {
    const password = await bcrypt.hash('Demo@123', 10);
    const roles = [
      ['admin@opsflow.demo', 'Aarav Mehta', 'ADMIN'],
      ['sales@opsflow.demo', 'Diya Shah', 'SALES'],
      ['warehouse@opsflow.demo', 'Kabir Nair', 'WAREHOUSE'],
      ['accounts@opsflow.demo', 'Mira Iyer', 'ACCOUNTS']
    ];

    for (const [email, fullName, role] of roles) {
      await client.query(
        `INSERT INTO users(email,password_hash,full_name,role)
         VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name, role=EXCLUDED.role`,
        [email, password, fullName, role]
      );
    }

    const admin = (await client.query(`SELECT id FROM users WHERE email='admin@opsflow.demo'`)).rows[0].id;
    const sales = (await client.query(`SELECT id FROM users WHERE email='sales@opsflow.demo'`)).rows[0].id;
    const accounts = (await client.query(`SELECT id FROM users WHERE email='accounts@opsflow.demo'`)).rows[0].id;

    const productRows = await client.query(`SELECT id,sku,current_stock FROM products ORDER BY created_at ASC`);
    if (productRows.rowCount === 0) {
      const products = [
        ['Wireless Barcode Scanner', 'WBS-100', 'Warehouse Tech', 4499, 28, 8, 'Pune Central'],
        ['Thermal Printer 80mm', 'TP-80', 'Billing', 6299, 7, 5, 'Pune Central'],
        ['A4 Copier Paper Box', 'PAPER-A4', 'Office Supply', 2850, 46, 12, 'Pune Central'],
        ['POS Cash Drawer', 'POS-CD', 'POS Hardware', 3890, 0, 5, 'Pune Central'],
        ['Shipping Labels Roll', 'LBL-100', 'Packaging', 850, 13, 10, 'Pune North']
      ];
      for (const product of products) {
        const r = await client.query(
          `INSERT INTO products(name,sku,category,unit_price,current_stock,min_stock,warehouse)
           VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, product
        );
        if (Number(product[4]) > 0) {
          await client.query(
            `INSERT INTO stock_movements(product_id,quantity,movement_type,reason,created_by)
             VALUES($1,$2,'IN','Opening balance',$3)`,
            [r.rows[0].id, product[4], admin]
          );
        }
      }
    }

    const customerRows = await client.query(`SELECT id,business_name FROM customers ORDER BY created_at ASC`);
    if (customerRows.rowCount === 0) {
      const customers = [
        ['Rohan Kulkarni', '9822011101', 'rohan@primewholesale.in', 'Prime Wholesale', '27ABCDE1234F1Z2', 'WHOLESALE', 'Market Road, Pune', 'ACTIVE', '2026-09-12', 'Key account • quarterly volume buyer'],
        ['Neha Verma', '9890017744', 'neha@urbanmart.in', 'UrbanMart Retail', '27LMNOP6789Q1Z7', 'RETAIL', 'Kothrud, Pune', 'LEAD', '2026-09-10', 'Interested in POS bundle'],
        ['Vikram Sethi', '9777712312', 'vikram@distribox.in', 'Distribox India', '27QRSTU2468V1Z4', 'DISTRIBUTOR', 'Baner, Pune', 'ACTIVE', '2026-09-18', 'Distributor expansion discussion']
      ];
      for (const c of customers) {
        const r = await client.query(
          `INSERT INTO customers(name,mobile,email,business_name,gst_number,type,address,status,follow_up_date,notes,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, [...c, sales]
        );
        await client.query(
          `INSERT INTO customer_followups(customer_id,note,next_follow_up_date,created_by)
           VALUES($1,$2,$3,$4)`,
          [r.rows[0].id, c[9], c[8], sales]
        );
      }
    }

    const challanCount = Number((await client.query(`SELECT COUNT(*)::int AS count FROM challans`)).rows[0].count);
    if (challanCount === 0) {
      const customers = await client.query(`SELECT id,business_name,name FROM customers ORDER BY created_at ASC LIMIT 3`);
      const products = await client.query(`SELECT id,name,sku,unit_price,current_stock FROM products ORDER BY created_at ASC LIMIT 5`);
      const prime = customers.rows[0];
      const urban = customers.rows[1];
      const scanner = products.rows.find((p: any) => p.sku === 'WBS-100') || products.rows[0];
      const printer = products.rows.find((p: any) => p.sku === 'TP-80') || products.rows[1];

      const confirmedNumber = `CH-${String((await client.query(`SELECT nextval('challan_number_seq') AS next`)).rows[0].next).padStart(5, '0')}`;
      const confirmed = await client.query(
        `INSERT INTO challans(challan_number,customer_id,status,total_quantity,created_by,confirmed_at)
         VALUES($1,$2,'CONFIRMED',$3,$4,NOW()) RETURNING id`,
        [confirmedNumber, prime.id, 2, sales]
      );
      await client.query(
        `INSERT INTO challan_items(challan_id,product_id,product_name_snapshot,sku_snapshot,unit_price_snapshot,quantity)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [confirmed.rows[0].id, scanner.id, scanner.name, scanner.sku, scanner.unit_price, 2]
      );
      await client.query(`UPDATE products SET current_stock=current_stock-2,updated_at=NOW() WHERE id=$1`, [scanner.id]);
      await client.query(
        `INSERT INTO stock_movements(product_id,quantity,movement_type,reason,created_by)
         VALUES($1,2,'OUT',$2,$3)`,
        [scanner.id, `Sales Challan ${confirmedNumber}`, sales]
      );
      const invoiceNumber = `INV-2026-${String((await client.query(`SELECT nextval('invoice_number_seq') AS next`)).rows[0].next).padStart(5, '0')}`;
      const invoice = await client.query(
        `INSERT INTO invoices(invoice_number,challan_id,customer_id,created_by) VALUES($1,$2,$3,$4) RETURNING id`,
        [invoiceNumber, confirmed.rows[0].id, prime.id, accounts]
      );
      await client.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'SEED_DEMO','SYSTEM',$2,$3)`,
        [admin, confirmed.rows[0].id, JSON.stringify({ challan: confirmedNumber, invoice: invoiceNumber })]
      );

      const draftNumber = `CH-${String((await client.query(`SELECT nextval('challan_number_seq') AS next`)).rows[0].next).padStart(5, '0')}`;
      const draft = await client.query(
        `INSERT INTO challans(challan_number,customer_id,status,total_quantity,created_by)
         VALUES($1,$2,'DRAFT',$3,$4) RETURNING id`,
        [draftNumber, urban.id, 2, sales]
      );
      await client.query(
        `INSERT INTO challan_items(challan_id,product_id,product_name_snapshot,sku_snapshot,unit_price_snapshot,quantity)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [draft.rows[0].id, printer.id, printer.name, printer.sku, printer.unit_price, 2]
      );
      await client.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'SEED_DEMO','SYSTEM',$2,$3)`,
        [admin, draft.rows[0].id, JSON.stringify({ challan: draftNumber })]
      );
    }
  });

  console.log('Seed complete. Demo password: Demo@123');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
