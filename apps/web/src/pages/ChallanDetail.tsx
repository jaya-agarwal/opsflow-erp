import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle2, FileText, UserRound, Building2 } from 'lucide-react';
import { api, formatDate, money, openPdf } from '../api';
import { useAuth } from '../auth';
import Badge from '../components/Badge';
import Toast from '../components/Toast';

export default function ChallanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState<any>();
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);

  const load = () => api.get(`/challans/${id}`).then(r => setC(r.data.data));
  useEffect(() => { load(); }, [id]);

  if (!c) return <div className="empty-page">Loading challan…</div>;

  const confirm = async () => {
    try {
      await api.patch(`/challans/${id}/status`, { status: 'CONFIRMED' });
      setToast({ m: 'Challan confirmed and stock updated.', t: 'success' });
      await load();
    } catch (e: any) {
      setToast({ m: e?.response?.data?.message || 'Could not confirm challan', t: 'error' });
    }
  };

  const openChallanPdf = () => openPdf(`/challans/${id}/pdf`).catch(() => setToast({ m: 'Could not open PDF', t: 'error' }));
  const cancel = async () => { try { await api.patch(`/challans/${id}/status`, { status: 'CANCELLED' }); setToast({ m: 'Draft challan cancelled.', t: 'success' }); await load(); } catch (e: any) { setToast({ m: e?.response?.data?.message || 'Could not cancel challan', t: 'error' }); } };
  const openInvoicePdf = () => openPdf(`/invoices/${c.invoiceId}/pdf`).catch(() => setToast({ m: 'Could not open invoice PDF', t: 'error' }));
  const canInvoice = c.status === 'CONFIRMED' && c.invoiceId && ['ADMIN', 'ACCOUNTS'].includes(user?.role || '');

  return <div>
    <button className="back-link" onClick={() => navigate('/challans')}><ArrowLeft size={16} /> Sales Challans</button>
    <div className="page-header">
      <div><div className="eyebrow">SALES / DOCUMENT DETAIL</div><div className="title-with-status"><h1>{c.challanNumber}</h1><Badge value={c.status} /></div><p>Review the dispatch before sharing the document.</p></div>
      <div className="header-actions">
        {canInvoice && <button className="btn btn-ghost" onClick={openInvoicePdf}><FileText size={16} /> Invoice PDF</button>}
        {c.status === 'DRAFT' && <><button className="btn btn-ghost" onClick={cancel}>Cancel draft</button><button className="btn btn-primary" onClick={confirm}><CheckCircle2 size={16} /> Confirm</button></>}
        <button className="btn btn-ghost" onClick={openChallanPdf}><Download size={16} /> Challan PDF</button>
      </div>
    </div>

    <div className="detail-grid">
      <div className="panel">
        <div className="panel-head"><div><h3>Customer</h3><p>Dispatch recipient</p></div><UserRound size={18} className="muted-icon" /></div>
        <div className="info-grid compact">
          <div><span><Building2 size={14} /> Business</span><strong>{c.businessName}</strong></div>
          <div><span>Contact</span><strong>{c.customerName}</strong></div>
          <div><span>Mobile</span><strong>{c.mobile}</strong></div>
          <div><span>Date</span><strong>{formatDate(c.createdAt)}</strong></div>
          <div className="full"><span>Address</span><strong>{c.address}</strong></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h3>Line items</h3><p>Snapshot values at draft time.</p></div><FileText size={18} className="muted-icon" /></div>
        <div className="table-shell"><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Value</th></tr></thead><tbody>{c.items.map((i: any) => <tr key={i.id}><td><strong>{i.productName}</strong></td><td>{i.sku}</td><td>{i.quantity}</td><td>{money(i.unitPrice)}</td><td>{money(Number(i.unitPrice) * Number(i.quantity))}</td></tr>)}</tbody></table></div>
        <div className="invoice-total"><span>Total quantity</span><strong>{c.totalQuantity}</strong></div>
      </div>
    </div>
    {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
  </div>;
}
