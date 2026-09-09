import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { authenticate, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../middleware/async';
import { query } from '../db';
import { HttpError } from '../utils/httpError';

const router = Router();
router.use(authenticate, requireRoles('ADMIN', 'ACCOUNTS'));

router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const values: unknown[] = [];
  let where = '';
  if (search) {
    values.push(`%${search}%`);
    where = `WHERE (i.invoice_number ILIKE $1 OR c.business_name ILIKE $1 OR ch.challan_number ILIKE $1)`;
  }
  const result = await query(`
    SELECT i.id, i.invoice_number AS "invoiceNumber", i.challan_id AS "challanId", i.status,
           i.issued_at AS "issuedAt", ch.challan_number AS "challanNumber",
           c.business_name AS customer, c.name AS "customerName",
           ch.total_quantity AS "totalQuantity",
           COALESCE((SELECT SUM(ci.unit_price_snapshot * ci.quantity) FROM challan_items ci WHERE ci.challan_id=ch.id), 0)::numeric AS subtotal
    FROM invoices i
    JOIN challans ch ON ch.id=i.challan_id
    JOIN customers c ON c.id=i.customer_id
    ${where}
    ORDER BY i.issued_at DESC
    LIMIT 100`, values);
  res.json({ success: true, data: result.rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT i.id, i.invoice_number AS "invoiceNumber", i.status, i.issued_at AS "issuedAt",
           ch.id AS "challanId", ch.challan_number AS "challanNumber",
           c.name AS "customerName", c.business_name AS "businessName", c.mobile, c.email,
           c.gst_number AS "gstNumber", c.address, ch.total_quantity AS "totalQuantity"
    FROM invoices i
    JOIN challans ch ON ch.id=i.challan_id
    JOIN customers c ON c.id=i.customer_id
    WHERE i.id=$1`, [req.params.id]);
  if (!result.rows[0]) throw new HttpError(404, 'Invoice not found');
  const items = await query(`SELECT product_name_snapshot AS name, sku_snapshot AS sku, unit_price_snapshot AS "unitPrice", quantity FROM challan_items WHERE challan_id=$1 ORDER BY id`, [result.rows[0].challanId]);
  res.json({ success: true, data: { ...result.rows[0], items: items.rows } });
}));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT i.invoice_number AS "invoiceNumber", i.status, i.issued_at AS "issuedAt",
           ch.challan_number AS "challanNumber", ch.total_quantity AS "totalQuantity",
           c.name AS "customerName", c.business_name AS "businessName", c.mobile, c.email,
           c.gst_number AS "gstNumber", c.address
    FROM invoices i
    JOIN challans ch ON ch.id=i.challan_id
    JOIN customers c ON c.id=i.customer_id
    WHERE i.id=$1`, [req.params.id]);
  if (!result.rows[0]) throw new HttpError(404, 'Invoice not found');
  const items = await query(`SELECT product_name_snapshot AS name, sku_snapshot AS sku, unit_price_snapshot AS price, quantity FROM challan_items ci JOIN invoices i ON i.challan_id=ci.challan_id WHERE i.id=$1 ORDER BY ci.id`, [req.params.id]);
  const invoice = result.rows[0];
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).fillColor('#101828').text('OPSFLOW', 48, 48, { continued: true });
  doc.fontSize(10).fillColor('#667085').text('  |  Invoice Center');
  doc.moveDown();
  doc.fontSize(18).fillColor('#111827').text('Tax invoice preview');
  doc.fontSize(10).fillColor('#667085').text(`${invoice.invoiceNumber} • Source challan ${invoice.challanNumber} • ${new Date(invoice.issuedAt).toLocaleDateString('en-IN')}`);
  doc.moveDown(1.2);
  doc.fontSize(11).fillColor('#111827').text('Bill to');
  doc.fontSize(10).fillColor('#344054').text(`${invoice.customerName} — ${invoice.businessName}`).text(invoice.mobile).text(invoice.email || '—').text(invoice.gstNumber ? `GSTIN: ${invoice.gstNumber}` : 'GSTIN: Not provided').text(invoice.address);
  doc.moveDown();

  const startY = doc.y;
  doc.rect(48, startY - 4, 499, 24).fill('#F2F4F7');
  doc.fillColor('#344054').fontSize(9).text('PRODUCT', 56, startY + 4).text('SKU', 270, startY + 4).text('QTY', 360, startY + 4).text('AMOUNT', 430, startY + 4);
  let y = startY + 34;
  let subtotal = 0;
  for (const item of items.rows) {
    const line = Number(item.price) * Number(item.quantity);
    subtotal += line;
    doc.fillColor('#101828').fontSize(9).text(item.name, 56, y, { width: 200 }).text(item.sku, 270, y, { width: 80 }).text(String(item.quantity), 360, y).text(`₹${line.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 430, y, { width: 110, align: 'right' });
    y += 26;
  }
  doc.moveTo(48, y).lineTo(547, y).strokeColor('#EAECF0').stroke();
  y += 18;
  doc.fontSize(10).fillColor('#344054').text(`Total quantity: ${invoice.totalQuantity}`, 56, y);
  doc.fontSize(12).fillColor('#111827').text(`Subtotal: ₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 340, y, { width: 190, align: 'right' });
  y += 45;
  doc.fontSize(9).fillColor('#667085').text('Demo note: tax calculation is intentionally excluded from this case-study invoice preview. Product prices are snapshot values from the confirmed challan.');
  doc.end();
}));

export default router;
