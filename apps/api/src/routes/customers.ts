import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query, withTransaction } from '../db';
import { HttpError } from '../utils/httpError';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(2), mobile: z.string().min(8), email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().min(2), gstNumber: z.string().max(40).optional().or(z.literal('')),
  type: z.enum(['RETAIL','WHOLESALE','DISTRIBUTOR']), address: z.string().min(5),
  status: z.enum(['LEAD','ACTIVE','INACTIVE']), followUpDate: z.string().optional().or(z.literal('')), notes: z.string().max(1000).optional().or(z.literal(''))
});

router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const type = String(req.query.type || '').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(5, Number(req.query.limit || 10)));
  const offset = (page - 1) * limit;
  const where: string[] = [];
  const values: unknown[] = [];
  if (search) { values.push(`%${search}%`); where.push(`(name ILIKE $${values.length} OR business_name ILIKE $${values.length} OR mobile ILIKE $${values.length})`); }
  if (status) { values.push(status); where.push(`status = $${values.length}`); }
  if (type) { values.push(type); where.push(`type = $${values.length}`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countResult = await query<{count:string}>(`SELECT COUNT(*)::text AS count FROM customers ${clause}`, values);
  values.push(limit, offset);
  const result = await query(`SELECT id, name, mobile, email, business_name AS "businessName", gst_number AS "gstNumber", type, address, status, follow_up_date AS "followUpDate", notes, created_at AS "createdAt" FROM customers ${clause} ORDER BY created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`, values);
  res.json({ success: true, data: result.rows, pagination: { page, limit, total: Number(countResult.rows[0].count), pages: Math.ceil(Number(countResult.rows[0].count) / limit) } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await query(`SELECT id, name, mobile, email, business_name AS "businessName", gst_number AS "gstNumber", type, address, status, follow_up_date AS "followUpDate", notes, created_at AS "createdAt" FROM customers WHERE id = $1`, [req.params.id]);
  if (!customer.rows[0]) throw new HttpError(404, 'Customer not found');
  const followups = await query(`SELECT f.id, f.note, f.next_follow_up_date AS "nextFollowUpDate", f.created_at AS "createdAt", u.full_name AS "createdBy" FROM customer_followups f LEFT JOIN users u ON u.id=f.created_by WHERE customer_id = $1 ORDER BY f.created_at DESC`, [req.params.id]);
  res.json({ success: true, data: { ...customer.rows[0], followups: followups.rows } });
}));

router.post('/', requireRoles('ADMIN','SALES'), asyncHandler(async (req, res) => {
  const input = customerSchema.parse(req.body);
  const result = await query(`INSERT INTO customers (name,mobile,email,business_name,gst_number,type,address,status,follow_up_date,notes,created_by) VALUES ($1,$2,NULLIF($3,''),$4,NULLIF($5,''),$6,$7,$8,NULLIF($9,'')::date,NULLIF($10,''),$11) RETURNING id`, [input.name,input.mobile,input.email||'',input.businessName,input.gstNumber||'',input.type,input.address,input.status,input.followUpDate||'',input.notes||'',req.user!.id]);
  await query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'CUSTOMER_CREATED','CUSTOMER',$2,$3)`, [req.user!.id, result.rows[0].id, JSON.stringify({ businessName: input.businessName })]);
  res.status(201).json({ success: true, message: 'Customer created', id: result.rows[0].id });
}));

router.put('/:id', requireRoles('ADMIN','SALES'), asyncHandler(async (req, res) => {
  const input = customerSchema.parse(req.body);
  const result = await query(`UPDATE customers SET name=$1,mobile=$2,email=NULLIF($3,''),business_name=$4,gst_number=NULLIF($5,''),type=$6,address=$7,status=$8,follow_up_date=NULLIF($9,'')::date,notes=NULLIF($10,''),updated_at=NOW() WHERE id=$11 RETURNING id`, [input.name,input.mobile,input.email||'',input.businessName,input.gstNumber||'',input.type,input.address,input.status,input.followUpDate||'',input.notes||'',req.params.id]);
  if (!result.rows[0]) throw new HttpError(404, 'Customer not found');
  await query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'CUSTOMER_UPDATED','CUSTOMER',$2,$3)`, [req.user!.id, req.params.id, JSON.stringify({ businessName: input.businessName })]);
  res.json({ success: true, message: 'Customer updated' });
}));

router.post('/:id/followups', requireRoles('ADMIN','SALES'), asyncHandler(async (req, res) => {
  const schema = z.object({ note: z.string().min(3), nextFollowUpDate: z.string().optional().or(z.literal('')) });
  const input = schema.parse(req.body);
  await withTransaction(async client => {
    const exists = await client.query('SELECT id FROM customers WHERE id=$1', [req.params.id]);
    if (!exists.rows[0]) throw new HttpError(404, 'Customer not found');
    await client.query(`INSERT INTO customer_followups (customer_id,note,next_follow_up_date,created_by) VALUES ($1,$2,NULLIF($3,'')::date,$4)`, [req.params.id,input.note,input.nextFollowUpDate||'',req.user!.id]);
    if (input.nextFollowUpDate) await client.query('UPDATE customers SET follow_up_date=$1, updated_at=NOW() WHERE id=$2', [input.nextFollowUpDate,req.params.id]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'FOLLOWUP_ADDED','CUSTOMER',$2,$3)`, [req.user!.id, req.params.id, JSON.stringify({ note: input.note })]);
  });
  res.status(201).json({ success: true, message: 'Follow-up added' });
}));

export default router;
