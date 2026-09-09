import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileSpreadsheet, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, formatDate, money, openPdf } from '../api';
import PageHeader from '../components/PageHeader';
import Badge from '../components/Badge';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

export default function Invoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/invoices', { params: { search } })
      .then(r => setRows(r.data.data))
      .catch(e => setToast({ m: e?.response?.data?.message || 'Could not load invoices', t: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const pdf = (id: string) => openPdf(`/invoices/${id}/pdf`).catch(() => setToast({ m: 'Could not open invoice PDF', t: 'error' }));

  return <div>
    <PageHeader
      eyebrow="ACCOUNTS / DOCUMENT CENTER"
      title="Invoice center"
      subtitle="Invoices are issued automatically from confirmed challans, preserving the original product snapshot."
      action={<div className="status-banner"><FileSpreadsheet size={16} /> Source-controlled documents</div>}
    />

    <div className="toolbar">
      <div className="search-box"><Search size={17} /><input placeholder="Search invoice, challan or customer…" value={search} onChange={e => setSearch(e.target.value)} /></div>
    </div>

    <div className="panel table-panel">
      {loading ? <Loading /> : rows.length === 0 ? <div className="empty-page">No invoices yet. Confirm a sales challan to issue the first invoice.</div> :
        <div className="table-shell"><table><thead><tr><th>Invoice</th><th>Source challan</th><th>Customer</th><th>Quantity</th><th>Subtotal</th><th>Status</th><th>Issued</th><th>Actions</th></tr></thead>
          <tbody>{rows.map(i => <tr key={i.id}>
            <td><div className="doc-cell"><FileSpreadsheet size={16} /><strong>{i.invoiceNumber}</strong></div></td>
            <td><strong>{i.challanNumber}</strong></td>
            <td><div><strong>{i.customer}</strong><span className="cell-sub">{i.customerName}</span></div></td>
            <td>{i.totalQuantity}</td>
            <td>{money(i.subtotal)}</td>
            <td><Badge value={i.status} /></td>
            <td>{formatDate(i.issuedAt)}</td>
            <td><div className="row-actions"><button className="icon-btn" title="Invoice PDF" onClick={() => pdf(i.id)}><Download size={16} /></button><Link className="icon-btn" title="Source challan" to={`/challans/${i.challanId || ''}`}><ExternalLink size={16} /></Link></div></td>
          </tr>)}</tbody>
        </table></div>}
    </div>

    <div className="callout"><div className="callout-icon"><FileSpreadsheet size={17} /></div><div><strong>Interview-ready business flow</strong><span>A confirmed challan creates a traceable invoice record in the same database transaction, so Accounts can work from a stable document trail instead of re-keying sales data.</span></div></div>
    {toast && <Toast message={toast.m} type={toast.t} onClose={() => setToast(null)} />}
  </div>;
}
