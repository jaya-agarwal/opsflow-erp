import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query } from '../db';

const router = Router();
router.use(authenticate);
router.get('/movements', asyncHandler(async (req,res)=>{
  const type=String(req.query.type||'');
  const search=String(req.query.search||'').trim();
  const values:unknown[]=[]; const where:string[]=[];
  if(type){values.push(type);where.push(`sm.movement_type=$${values.length}`);}
  if(search){values.push(`%${search}%`);where.push(`(p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR sm.reason ILIKE $${values.length})`);}
  const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
  const result=await query(`SELECT sm.id, p.name AS product, p.sku, sm.quantity, sm.movement_type AS type, sm.reason, u.full_name AS "createdBy", sm.created_at AS "createdAt" FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN users u ON u.id=sm.created_by ${clause} ORDER BY sm.created_at DESC LIMIT 100`,values);
  res.json({success:true,data:result.rows});
}));
export default router;
