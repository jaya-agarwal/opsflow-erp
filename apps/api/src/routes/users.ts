import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query } from '../db';

const router=Router(); router.use(authenticate,requireRoles('ADMIN'));
router.get('/',asyncHandler(async(_req,res)=>{
  const result=await query(`SELECT id,email,full_name AS "fullName",role,created_at AS "createdAt" FROM users ORDER BY created_at DESC`);
  res.json({success:true,data:result.rows});
}));
export default router;
