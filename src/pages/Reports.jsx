import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { todayGB } from '../data/seed'
import { formatINR } from '../utils/money'
import { duePaise } from '../utils/helpers'
import { hsnSummary } from '../utils/tax'
import { calcLineItem } from '../utils/money'

export default function Reports() {
  const { estimates, products, shop } = useData()
  const [mode, setMode] = useState('month') // day | month
  const today = todayGB()
  const monthKey = today.slice(3)

  const filtered = useMemo(() => {
    if (mode === 'day') return estimates.filter((e) => e.date === today)
    return estimates.filter((e) => String(e.date).endsWith(monthKey))
  }, [estimates, mode, today, monthKey])

  const sales = filtered.reduce((s, e) => s + (e.totals?.grandTotalPaise || 0), 0)
  const gst = filtered.reduce((s, e) => s + (e.totals?.gstPaise || 0), 0)
  const creditDue = filtered
    .filter((e) => e.paymentStatus === 'credit' || e.paymentStatus === 'partial')
    .reduce((s, e) => s + duePaise(e), 0)

  const byCustomer = useMemo(() => {
    const map = new Map()
    for (const e of filtered) {
      const name = e.customer?.name || '—'
      map.set(name, (map.get(name) || 0) + (e.totals?.grandTotalPaise || 0))
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [filtered])

  const allLines = filtered.flatMap((e) =>
    (e.lines || []).map((l) => ({
      ...l,
      ...calcLineItem({ quantity: l.quantity, price: l.price, gstPercent: l.gstPercent }),
    })),
  )
  const hsn = hsnSummary(allLines)

  const lowStock = products.filter(
    (p) => p.trackStock !== false && Number(p.stockQty) <= Number(shop?.lowStockAt ?? 10),
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Reports</h1>
          <p>Daily / monthly sales, GST, dues, HSN, stock alerts</p>
        </div>
        <div className="btn-row">
          <button type="button" className={`btn secondary ${mode === 'day' ? 'active-toggle' : ''}`} onClick={() => setMode('day')}>
            Today
          </button>
          <button type="button" className={`btn secondary ${mode === 'month' ? 'active-toggle' : ''}`} onClick={() => setMode('month')}>
            This month
          </button>
        </div>
      </div>

      <div className="grid-stats">
        <div className="card stat">
          <span>Bills</span>
          <strong>{filtered.length}</strong>
        </div>
        <div className="card stat">
          <span>Sales</span>
          <strong>{formatINR(sales)}</strong>
        </div>
        <div className="card stat">
          <span>GST</span>
          <strong>{formatINR(gst)}</strong>
        </div>
        <div className="card stat">
          <span>Credit due</span>
          <strong>{formatINR(creditDue)}</strong>
        </div>
      </div>

      <div className="stack">
        <div className="card split-2">
          <div>
            <h2 className="card-title">Top customers</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {byCustomer.map(([name, amt]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="num">{formatINR(amt)}</td>
                  </tr>
                ))}
                {!byCustomer.length && (
                  <tr>
                    <td colSpan={2} className="muted">
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="card-title">Low stock</h2>
            <table className="data">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="num">{p.stockQty}</td>
                  </tr>
                ))}
                {!lowStock.length && (
                  <tr>
                    <td colSpan={2} className="muted">
                      All good
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">HSN summary</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>HSN</th>
                  <th className="num">Rate</th>
                  <th className="num">Taxable</th>
                  <th className="num">GST</th>
                </tr>
              </thead>
              <tbody>
                {hsn.map((r) => (
                  <tr key={`${r.hsn}-${r.rate}`}>
                    <td className="mono">{r.hsn}</td>
                    <td className="num">{r.rate}%</td>
                    <td className="num">{formatINR(r.taxablePaise)}</td>
                    <td className="num">{formatINR(r.gstPaise)}</td>
                  </tr>
                ))}
                {!hsn.length && (
                  <tr>
                    <td colSpan={4} className="muted">
                      No lines in range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
