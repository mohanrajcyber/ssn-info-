import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { t } from '../i18n'
import { formatINR } from '../utils/money'
import { buildWhatsAppText, openWhatsApp } from '../utils/helpers'

export default function EstimatesList() {
  const { estimates, deleteEstimate, shop, prefs } = useData()
  const lang = prefs?.language || 'en'
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return estimates
    return estimates.filter(
      (e) =>
        e.estimateNo?.toLowerCase().includes(s) ||
        e.customer?.name?.toLowerCase().includes(s) ||
        e.date?.includes(s) ||
        e.docType?.includes(s) ||
        e.paymentStatus?.includes(s),
    )
  }, [estimates, q])

  async function remove(id) {
    if (!confirm('Delete this bill from database?')) return
    await deleteEstimate(id)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Bills</p>
          <h1>{t(lang, 'allBills')}</h1>
          <p>{estimates.length} in database</p>
        </div>
        <Link className="btn" to="/estimates/new">
          + {t(lang, 'newBill')}
        </Link>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="field grow">
            <label>Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="No / customer / date / paid" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No bills match.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Pay</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{e.estimateNo}</td>
                    <td>{e.docType === 'invoice' ? 'Invoice' : 'Estimate'}</td>
                    <td>{e.date}</td>
                    <td>{e.customer?.name || '—'}</td>
                    <td>{e.paymentStatus || 'paid'}</td>
                    <td className="num">{e.lines?.length || 0}</td>
                    <td className="num strong">{formatINR(e.totals?.grandTotalPaise || 0)}</td>
                    <td>
                      <div className="btn-row end">
                        <Link className="btn secondary" to={`/estimates/${e.id}`}>
                          Edit
                        </Link>
                        <Link className="btn" to={`/estimates/${e.id}/print`}>
                          Print
                        </Link>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => openWhatsApp(e.customer?.phone, buildWhatsAppText(shop, e))}
                        >
                          WA
                        </button>
                        <button type="button" className="btn danger" onClick={() => remove(e.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
