import { Router } from 'express';
import { asyncHandler } from '../middleware/async';
import { authenticate } from '../middleware/auth';
import { query } from '../db';

const router = Router();
router.use(authenticate);

router.get('/summary', asyncHandler(async (_req, res) => {
  const [customers, products, lowStock, challans, movements, followups, recentChallans, draftChallans, overdueFollowups] = await Promise.all([
    query<{count:string}>('SELECT COUNT(*)::text AS count FROM customers'),
    query<{count:string}>('SELECT COUNT(*)::text AS count FROM products'),
    query<{count:string}>('SELECT COUNT(*)::text AS count FROM products WHERE current_stock <= min_stock'),
    query<{count:string}>('SELECT COUNT(*)::text AS count FROM challans WHERE status = \'CONFIRMED\''),
    query('SELECT DATE(created_at) AS date, movement_type AS type, SUM(quantity)::int AS quantity FROM stock_movements WHERE created_at >= NOW() - INTERVAL \'13 days\' GROUP BY DATE(created_at), movement_type ORDER BY date'),
    query('SELECT c.id, c.name, c.business_name, c.follow_up_date, c.status FROM customers c WHERE c.follow_up_date IS NOT NULL AND c.follow_up_date <= CURRENT_DATE + INTERVAL \'7 days\' ORDER BY c.follow_up_date ASC LIMIT 6'),
    query('SELECT ch.id, ch.challan_number, ch.status, ch.total_quantity, ch.created_at, c.business_name AS customer FROM challans ch JOIN customers c ON c.id = ch.customer_id ORDER BY ch.created_at DESC LIMIT 6'),
    query<{count:string}>("SELECT COUNT(*)::text AS count FROM challans WHERE status='DRAFT'"),
    query<{count:string}>("SELECT COUNT(*)::text AS count FROM customers WHERE follow_up_date IS NOT NULL AND follow_up_date < CURRENT_DATE AND status <> 'INACTIVE'")
  ]);

  const lowStockProducts = await query('SELECT id, name, sku, current_stock, min_stock, warehouse, CASE WHEN current_stock = 0 THEN \'OUT\' WHEN current_stock <= min_stock THEN \'LOW\' ELSE \'OK\' END AS stock_status FROM products WHERE current_stock <= min_stock ORDER BY current_stock ASC LIMIT 8');

  const low = Number(lowStock.rows[0].count);
  const drafts = Number(draftChallans.rows[0].count);
  const overdue = Number(overdueFollowups.rows[0].count);
  const opsScore = Math.max(0, Math.min(100, 100 - (low * 6) - (drafts * 3) - (overdue * 7)));
  const exceptionQueue = [
    ...lowStockProducts.rows.slice(0, 3).map((p:any) => ({ type: 'STOCK', title: `${p.name} needs attention`, detail: p.current_stock === 0 ? 'Out of stock' : `${p.current_stock} units left against ${p.min_stock}`, priority: p.current_stock === 0 ? 'HIGH' : 'MEDIUM', href: '/products' })),
    ...(overdue > 0 ? [{ type: 'CRM', title: `${overdue} follow-up${overdue === 1 ? '' : 's'} overdue`, detail: 'Reconnect with active customers before the next review cycle.', priority: 'HIGH', href: '/customers' }] : []),
    ...(drafts > 0 ? [{ type: 'SALES', title: `${drafts} draft challan${drafts === 1 ? '' : 's'} waiting`, detail: 'Review stock and confirm or cancel stale drafts.', priority: 'MEDIUM', href: '/challans' }] : [])
  ].slice(0, 5);

  res.json({ success: true, data: {
    kpis: {
      customers: Number(customers.rows[0].count),
      products: Number(products.rows[0].count),
      lowStock: low,
      confirmedChallans: Number(challans.rows[0].count)
    },
    signals: { lowStock: low, draftChallans: drafts, overdueFollowups: overdue },
    opsScore,
    exceptionQueue,
    stockTrend: movements.rows,
    followups: followups.rows,
    recentChallans: recentChallans.rows,
    lowStockProducts: lowStockProducts.rows
  }});
}));

export default router;
