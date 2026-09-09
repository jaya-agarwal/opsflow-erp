import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query } from '../db';
const router=Router(); router.use(authenticate,requireRoles('ADMIN'));
router.get('/',asyncHandler(async(req,res)=>{const search=String(req.query.search||'');const values:unknown[]=[];let clause='';if(search){values.push(`%${search}%`);clause='WHERE a.action ILIKE $1 OR a.entity_type ILIKE $1 OR u.full_name ILIKE $1';}const result=await query(`SELECT a.id,a.action,a.entity_type AS "entityType",a.entity_id AS "entityId",a.metadata,a.created_at AS "createdAt",COALESCE(u.full_name,'System') AS "actor" FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ${clause} ORDER BY a.created_at DESC LIMIT 120`,values);res.json({success:true,data:result.rows})}));
export default router;
