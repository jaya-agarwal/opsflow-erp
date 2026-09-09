import { Router } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query, withTransaction } from '../db';
import { HttpError } from '../utils/httpError';

const router=Router(); router.use(authenticate);

const itemSchema=z.object({productId:z.string().uuid(),quantity:z.coerce.number().int().positive()});
const createSchema=z.object({customerId:z.string().uuid(),items:z.array(itemSchema).min(1)});

async function nextChallanNumber(client:any){
  const result=await client.query(`SELECT nextval('challan_number_seq') AS next`);
  return `CH-${String(result.rows[0].next).padStart(5,'0')}`;
}

async function nextInvoiceNumber(client:any){
  const result=await client.query(`SELECT nextval('invoice_number_seq') AS next`);
  return `INV-2026-${String(result.rows[0].next).padStart(5,'0')}`;
}

router.get('/',asyncHandler(async(req,res)=>{
  const status=String(req.query.status||''); const search=String(req.query.search||'').trim();
  const values:unknown[]=[]; const where:string[]=[];
  if(status){values.push(status);where.push(`ch.status=$${values.length}`);}
  if(search){values.push(`%${search}%`);where.push(`(ch.challan_number ILIKE $${values.length} OR c.business_name ILIKE $${values.length})`);}
  const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
  const result=await query(`SELECT ch.id,ch.challan_number AS "challanNumber",ch.status,ch.total_quantity AS "totalQuantity",ch.created_at AS "createdAt",ch.confirmed_at AS "confirmedAt",c.id AS "customerId",c.business_name AS customer,u.full_name AS "createdBy",i.invoice_number AS "invoiceNumber" FROM challans ch JOIN customers c ON c.id=ch.customer_id LEFT JOIN users u ON u.id=ch.created_by LEFT JOIN invoices i ON i.challan_id=ch.id ${clause} ORDER BY ch.created_at DESC LIMIT 100`,values);
  res.json({success:true,data:result.rows});
}));

router.get('/:id',asyncHandler(async(req,res)=>{
  const result=await query(`SELECT ch.id,ch.challan_number AS "challanNumber",ch.status,ch.total_quantity AS "totalQuantity",ch.created_at AS "createdAt",ch.confirmed_at AS "confirmedAt",c.name AS "customerName",c.business_name AS "businessName",c.mobile,c.email,c.address,u.full_name AS "createdBy",i.id AS "invoiceId",i.invoice_number AS "invoiceNumber" FROM challans ch JOIN customers c ON c.id=ch.customer_id LEFT JOIN users u ON u.id=ch.created_by LEFT JOIN invoices i ON i.challan_id=ch.id WHERE ch.id=$1`,[req.params.id]);
  if(!result.rows[0]) throw new HttpError(404,'Challan not found');
  const items=await query(`SELECT id,product_id AS "productId",product_name_snapshot AS "productName",sku_snapshot AS sku,unit_price_snapshot AS "unitPrice",quantity FROM challan_items WHERE challan_id=$1 ORDER BY id`,[req.params.id]);
  res.json({success:true,data:{...result.rows[0],items:items.rows}});
}));

router.post('/',requireRoles('ADMIN','SALES'),asyncHandler(async(req,res)=>{
  const input=createSchema.parse(req.body);
  const id=await withTransaction(async client=>{
    const customer=await client.query('SELECT id FROM customers WHERE id=$1',[input.customerId]);
    if(!customer.rows[0]) throw new HttpError(404,'Customer not found');
    const ids=input.items.map(i=>i.productId);
    const products=await client.query(`SELECT id,name,sku,unit_price,current_stock FROM products WHERE id = ANY($1::uuid[])`,[ids]);
    if(products.rows.length!==ids.length) throw new HttpError(400,'One or more products could not be found');
    const map=new Map(products.rows.map(p=>[p.id,p]));
    const number=await nextChallanNumber(client);
    const total=input.items.reduce((s,i)=>s+i.quantity,0);
    const ch=await client.query(`INSERT INTO challans(challan_number,customer_id,total_quantity,created_by) VALUES ($1,$2,$3,$4) RETURNING id`,[number,input.customerId,total,req.user!.id]);
    for(const item of input.items){const p=map.get(item.productId); if(!p) throw new HttpError(400,'Invalid product'); await client.query(`INSERT INTO challan_items(challan_id,product_id,product_name_snapshot,sku_snapshot,unit_price_snapshot,quantity) VALUES($1,$2,$3,$4,$5,$6)`,[ch.rows[0].id,p.id,p.name,p.sku,p.unit_price,item.quantity]);}
    await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'CHALLAN_CREATED','CHALLAN',$2,$3)`,[req.user!.id,ch.rows[0].id,JSON.stringify({status:'DRAFT',number})]);
    return ch.rows[0].id;
  });
  res.status(201).json({success:true,message:'Challan saved as draft',id});
}));

router.patch('/:id/status',requireRoles('ADMIN','SALES'),asyncHandler(async(req,res)=>{
  const input=z.object({status:z.enum(['CONFIRMED','CANCELLED'])}).parse(req.body);
  await withTransaction(async client=>{
    const ch=await client.query(`SELECT id,status,challan_number FROM challans WHERE id=$1 FOR UPDATE`,[req.params.id]);
    if(!ch.rows[0]) throw new HttpError(404,'Challan not found');
    const current=ch.rows[0].status;
    if(current===input.status) return;
    if(input.status==='CONFIRMED'){
      if(current!=='DRAFT') throw new HttpError(409,`Cannot confirm a ${current.toLowerCase()} challan`);
      const items=await client.query(`SELECT ci.product_id,ci.quantity,ci.product_name_snapshot FROM challan_items ci WHERE ci.challan_id=$1`,[req.params.id]);
      for(const item of items.rows){
        const p=await client.query('SELECT current_stock FROM products WHERE id=$1 FOR UPDATE',[item.product_id]);
        const available=p.rows[0]?.current_stock ?? 0;
        if(available<item.quantity) throw new HttpError(409,`Insufficient stock for ${item.product_name_snapshot}. Available: ${available}, requested: ${item.quantity}`);
      }
      for(const item of items.rows){
        await client.query('UPDATE products SET current_stock=current_stock-$1,updated_at=NOW() WHERE id=$2',[item.quantity,item.product_id]);
        await client.query(`INSERT INTO stock_movements(product_id,quantity,movement_type,reason,created_by) VALUES($1,$2,'OUT',$3,$4)`,[item.product_id,item.quantity,`Sales Challan ${ch.rows[0].challan_number}`,req.user!.id]);
      }
      await client.query(`UPDATE challans SET status='CONFIRMED',confirmed_at=NOW() WHERE id=$1`,[req.params.id]);
      const invoiceNumber = await nextInvoiceNumber(client);
      const invoice = await client.query(`INSERT INTO invoices(invoice_number,challan_id,customer_id,created_by) SELECT $1, ch.id, ch.customer_id, $2 FROM challans ch WHERE ch.id=$3 RETURNING id`,[invoiceNumber,req.user!.id,req.params.id]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'CHALLAN_CONFIRMED','CHALLAN',$2,$3)`,[req.user!.id,req.params.id,JSON.stringify({number:ch.rows[0].challan_number,invoiceNumber})]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'INVOICE_ISSUED','INVOICE',$2,$3)`,[req.user!.id,invoice.rows[0].id,JSON.stringify({invoiceNumber,sourceChallan:ch.rows[0].challan_number})]);
    } else {
      if(current!=='DRAFT') throw new HttpError(409,'Only draft challans can be cancelled');
      await client.query(`UPDATE challans SET status='CANCELLED' WHERE id=$1`,[req.params.id]);
      await client.query(`INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES($1,'CHALLAN_CANCELLED','CHALLAN',$2,'{}')`,[req.user!.id,req.params.id]);
    }
  });
  res.json({success:true,message:`Challan ${input.status.toLowerCase()}`});
}));

router.get('/:id/pdf',asyncHandler(async(req,res)=>{
  const result=await query(`SELECT ch.challan_number AS "challanNumber",ch.status,ch.total_quantity AS "totalQuantity",ch.created_at AS "createdAt",c.name AS "customerName",c.business_name AS "businessName",c.mobile,c.email,c.address FROM challans ch JOIN customers c ON c.id=ch.customer_id WHERE ch.id=$1`,[req.params.id]);
  if(!result.rows[0]) throw new HttpError(404,'Challan not found');
  const items=await query(`SELECT product_name_snapshot AS name,sku_snapshot AS sku,unit_price_snapshot AS price,quantity FROM challan_items WHERE challan_id=$1`,[req.params.id]);
  const ch=result.rows[0]; const doc=new PDFDocument({margin:48,size:'A4'});
  res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition',`inline; filename="${ch.challanNumber}.pdf"`);
  doc.pipe(res);
  doc.fontSize(22).fillColor('#101828').text('OPSFLOW',48,48,{continued:true}); doc.fontSize(10).fillColor('#667085').text('  |  Operations ERP & CRM');
  doc.moveDown(); doc.fontSize(18).fillColor('#111827').text('Sales Challan');
  doc.fontSize(10).fillColor('#667085').text(`${ch.challanNumber} • ${ch.status} • ${new Date(ch.createdAt).toLocaleDateString('en-IN')}`);
  doc.moveDown(1.2); doc.fontSize(11).fillColor('#111827').text('Customer'); doc.fontSize(10).fillColor('#344054').text(`${ch.customerName} — ${ch.businessName}`).text(ch.mobile).text(ch.email || '').text(ch.address);
  doc.moveDown();
  const startY=doc.y; doc.rect(48,startY-4,499,24).fill('#F2F4F7'); doc.fillColor('#344054').fontSize(9).text('PRODUCT',56,startY+4).text('SKU',270,startY+4).text('QTY',360,startY+4).text('UNIT PRICE',425,startY+4);
  let y=startY+34; let subtotal=0;
  for(const item of items.rows){const line=Number(item.price)*Number(item.quantity);subtotal+=line; doc.fillColor('#101828').fontSize(9).text(item.name,56,y,{width:200}).text(item.sku,270,y,{width:80}).text(String(item.quantity),360,y).text(`₹${Number(item.price).toLocaleString('en-IN')}`,425,y); y+=26;}
  doc.moveTo(48,y).lineTo(547,y).strokeColor('#EAECF0').stroke(); y+=18; doc.fontSize(10).fillColor('#344054').text(`Total quantity: ${ch.totalQuantity}`,56,y); doc.fontSize(11).fillColor('#111827').text(`Indicative value: ₹${subtotal.toLocaleString('en-IN')}`,350,y,{width:190,align:'right'});
  y+=45; doc.fontSize(9).fillColor('#667085').text('Generated by OpsFlow • Product details are snapshot values from the challan.');
  doc.end();
}));

export default router;
