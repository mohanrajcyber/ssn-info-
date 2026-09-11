import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { todayGB } from '../data/seed'
import { t } from '../i18n'
import { formatINR } from '../utils/money'
import { backupOverdue, duePaise } from '../utils/helpers'

export default function Dashboard() {
  const { estimates, customers, products, shop, prefs } = useData()
  const lang = prefs?.language || 'en'
  const today = todayGB()
  const todayBills = estimates.filter((e) => e.date === today)
  const todayTotal = todayBills.reduce((sum, e) => sum + (e.totals?.grandTotalPaise || 0), 0)
  const monthPrefix = today.slice(3)
  const monthBills = estimates.filter((e) => String(e.date).endsWith(monthPrefix))
  const monthTotal = monthBills.reduce((sum, e) => sum + (e.totals?.grandTotalPaise || 0), 0)
  const dues = estimates.reduce((s, e) => s + duePaise(e), 0)
  const low = products.filter(
    (p) => p.trackStock !== false && Number(p.stockQty) <= Number(shop?.lowStockAt ?? 10),
  ).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{t(lang, 'welcome')}</p>
          <h1>{shop?.name}</h1>
          <p>Invoice · stock · GST split · reports · backup</p>
        </div>
        <Link className="btn" to="/estimates/new">
          + {t(lang, 'newBill')}
        </Link>
      </div>

      {backupOverdue(prefs?.lastBackupAt) && (
        <div className="banner warn">
          {t(lang, 'backupDue')}{' '}
          <Link to="/settings">
            <strong>Backup now</strong>
          </Link>
        </div>
      )}

      <div className="grid-stats">
        <div className="card stat reveal">
          <span>Today bills</span>
          <strong>{todayBills.length}</strong>
        </div>
        <div className="card stat reveal d1">
          <span>Today total</span>
          <strong>{formatINR(todayTotal)}</strong>
        </div>
        <div className="card stat reveal d2">
          <span>This month</span>
          <strong>{formatINR(monthTotal)}</strong>
        </div>
        <div className="card stat reveal d3">
          <span>Credit due / Low stock</span>
          <strong>
            {formatINR(dues)} / {low}
          </strong>
        </div>
      </div>

      <div className="card reveal">
        <div className="section-head">
          <div>
            <h2>Recent bills</h2>
            <p className="muted">
              {customers.length} customers · {products.length} products
            </p>
          </div>
          <div className="btn-row">
            <Link className="btn secondary" to="/reports">
              {t(lang, 'reports')}
            </Link>
            <Link className="btn secondary" to="/estimates">
              View all
            </Link>
          </div>
        </div>

        {estimates.length === 0 ? (
          <div className="empty">
            <h3>No bills yet</h3>
            <Link className="btn" to="/estimates/new">
              Create bill
            </Link>
          </div>
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
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {estimates.slice(0, 10).map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{e.estimateNo}</td>
                    <td>{e.docType === 'invoice' ? 'Invoice' : 'Estimate'}</td>
                    <td>{e.date}</td>
                    <td>{e.customer?.name || '—'}</td>
                    <td>{e.paymentStatus || 'paid'}</td>
                    <td className="num strong">{formatINR(e.totals?.grandTotalPaise || 0)}</td>
                    <td>
                      <div className="btn-row end">
                        <Link className="btn ghost" to={`/estimates/${e.id}`}>
                          Open
                        </Link>
                        <Link className="btn secondary" to={`/estimates/${e.id}/print`}>
                          Print
                        </Link>
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
