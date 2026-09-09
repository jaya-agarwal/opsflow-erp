import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query, withTransaction } from '../db';
import { HttpError } from '../utils/httpError';

const router = Router();
router.use(authenticate);
const productSchema = z.object({ name: z.string().min(2), sku: z.string().min(2), category: z.string().min(2), unitPrice: z.coerce.number().nonnegative(), currentStock: z.coerce.number().int().nonnegative(), minStock: z.coerce.number().int().nonnegative(), warehouse: z.string().min(2) });

router.get('/', asyncHandler(async (req,res)=>{
  const search=String(req.query.search||'').trim(); const stockStatus=String(req.query.stockStatus||'');
  const where:string[]=[]; const values:unknown[]=[];
  if(search){values.push(`%${search}%`); where.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length} OR category ILIKE $${values.length})`);}
  if(stockStatus==='LOW'){where.push('current_stock > 0 AND current_stock <= min_stock');}
  if(stockStatus==='OUT'){where.push('current_stock = 0');}
  if(stockStatus==='OK'){where.push('current_stock > min_stock');}
  const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
  const result=await query(`SELECT id,name,sku,category,unit_price AS "unitPrice",current_stock AS "currentStock",min_stock AS "minStock",warehouse,created_at AS "createdAt", CASE WHEN current_stock=0 THEN 'OUT' WHEN current_stock<=min_stock THEN 'LOW' ELSE 'OK' END AS "stockStatus" FROM products ${clause} ORDER BY name ASC`, values);
  res.json({success:true,data:result.rows});
}));

router.get('/:id', asyncHandler(async(req,res)=>{
  const result=await query(`SELECT id,name,sku,category,unit_price AS "unitPrice",current_stock AS "currentStock",min_stock AS "minStock",warehouse FROM products WHERE id=$1`,[req.params.id]);
  if(!result.rows[0]) throw new HttpError(404,'Product not found'); res.json({success:true,data:result.rows[0]});
}));

router.post('/', requireRoles('ADMIN','WAREHOUSE'), asyncHandler(async(req,res)=>{
  const input=productSchema.parse(req.body);
  const result=await withTransaction(async client=>{
    const p=await client.query(`INSERT INTO products (name,sku,category,unit_price,current_stock,min_stock,warehouse) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[input.name,input.sku,input.category,input.unitPrice,input.currentStock,input.minStock,input.warehouse]);
    if(input.currentStock>0) await client.query(`INSERT INTO stock_movements (product_id,quantity,movement_type,reason,created_by) VALUES ($1,$2,'IN','Opening balance',$3)`,[p.rows[0].id,input.currentStock,req.user!.id]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'PRODUCT_CREATED','PRODUCT',$2,$3)`,[req.user!.id,p.rows[0].id,JSON.stringify({sku:input.sku})]);
    return p.rows[0].id;
  });
  res.status(201).json({success:true,message:'Product created',id:result});
}));

router.put('/:id', requireRoles('ADMIN','WAREHOUSE'), asyncHandler(async(req,res)=>{
  const input=productSchema.omit({currentStock:true}).extend({currentStock:z.coerce.number().int().nonnegative().optional()}).parse(req.body);
  await withTransaction(async client=>{
    const current=await client.query('SELECT current_stock FROM products WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!current.rows[0]) throw new HttpError(404,'Product not found');
    const newStock=input.currentStock ?? current.rows[0].current_stock;
    const diff=newStock-current.rows[0].current_stock;
    await client.query(`UPDATE products SET name=$1,sku=$2,category=$3,unit_price=$4,current_stock=$5,min_stock=$6,warehouse=$7,updated_at=NOW() WHERE id=$8`,[input.name,input.sku,input.category,input.unitPrice,newStock,input.minStock,input.warehouse,req.params.id]);
    if(diff!==0) await client.query(`INSERT INTO stock_movements (product_id,quantity,movement_type,reason,created_by) VALUES ($1,$2,$3,$4,$5)`,[req.params.id,Math.abs(diff),diff>0?'IN':'OUT','Manual stock adjustment',req.user!.id]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'PRODUCT_UPDATED','PRODUCT',$2,$3)`,[req.user!.id,req.params.id,JSON.stringify({stockAdjustment:diff})]);
  });
  res.json({success:true,message:'Product updated'});
}));

router.post('/:id/stock', requireRoles('ADMIN','WAREHOUSE'), asyncHandler(async(req,res)=>{
  const input=z.object({quantity:z.coerce.number().int().positive(),type:z.enum(['IN','OUT']),reason:z.string().min(3)}).parse(req.body);
  await withTransaction(async client=>{
    const result=await client.query('SELECT current_stock FROM products WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!result.rows[0]) throw new HttpError(404,'Product not found');
    const stock=result.rows[0].current_stock;
    const next=input.type==='IN'?stock+input.quantity:stock-input.quantity;
    if(next<0) throw new HttpError(409,`Insufficient stock. Available: ${stock}`);
    await client.query('UPDATE products SET current_stock=$1,updated_at=NOW() WHERE id=$2',[next,req.params.id]);
    await client.query(`INSERT INTO stock_movements(product_id,quantity,movement_type,reason,created_by) VALUES ($1,$2,$3,$4,$5)`,[req.params.id,input.quantity,input.type,input.reason,req.user!.id]);
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'STOCK_MOVEMENT_RECORDED','PRODUCT',$2,$3)`,[req.user!.id,req.params.id,JSON.stringify({type:input.type,quantity:input.quantity,reason:input.reason})]);
  });
  res.json({success:true,message:'Stock updated'});
}));

export default router;
