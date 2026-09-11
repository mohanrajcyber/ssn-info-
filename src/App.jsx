import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { useData } from './data/DataContext'
import { t } from './i18n'
import Dashboard from './pages/Dashboard'
import EstimateEditor from './pages/EstimateEditor'
import EstimatesList from './pages/EstimatesList'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Settings from './pages/Settings'
import PrintEstimate from './pages/PrintEstimate'
import Reports from './pages/Reports'

function BootScreen() {
  const { status, error } = useData()
  if (status === 'error') {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <h1>Database error</h1>
          <p>{error}</p>
          <p className="muted small">WhatsApp browser skip pannitu Chrome / Safari-la open pannunga.</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="boot-screen">
      <div className="boot-card">
        <div className="boot-spinner" />
        <h1>SSN INFO AND ENTERPRISES</h1>
        <p>Opening secure local database…</p>
        <div className="boot-phases">
          <span className="on">1. Database</span>
          <span className="on">2. Memory</span>
          <span>3. Ready</span>
        </div>
      </div>
    </div>
  )
}

function PinLock() {
  const { tryUnlock, prefs } = useData()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const lang = prefs?.language || 'en'

  function submit(e) {
    e.preventDefault()
    if (tryUnlock(pin)) setErr('')
    else setErr('Wrong PIN')
  }

  return (
    <div className="boot-screen">
      <div className="boot-card">
        <h1>{t(lang, 'lockApp')}</h1>
        <p>{t(lang, 'enterPin')}</p>
        <form onSubmit={submit} className="stack" style={{ gap: '0.75rem' }}>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            style={{ padding: '0.7rem', borderRadius: 10, border: '1px solid var(--line)' }}
          />
          {err && <div style={{ color: 'var(--danger)' }}>{err}</div>}
          <button className="btn" type="submit">
            {t(lang, 'unlock')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const { status, shop, shops, busy, prefs, unlocked, switchShop, lockNow } = useData()
  const lang = prefs?.language || 'en'
  const [menuOpen, setMenuOpen] = useState(false)

  if (status !== 'ready') return <BootScreen />
  if (prefs?.pin && !unlocked) return <PinLock />

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className={`app-shell ${menuOpen ? 'menu-open' : ''}`}>
      <header className="mobile-topbar no-print">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-brand">
          <strong>SSN Info</strong>
          <small>{shop?.name || t(lang, 'appName')}</small>
        </div>
        <Link className="btn mobile-new" to="/estimates/new" onClick={closeMenu}>
          + Bill
        </Link>
      </header>

      <div
        className="nav-backdrop no-print"
        hidden={!menuOpen}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside className="sidebar no-print">
        <div className="brand">
          {shop?.logoDataUrl ? (
            <img src={shop.logoDataUrl} alt="" className="brand-logo" />
          ) : (
            <span className="brand-mark">SSN</span>
          )}
          <div>
            <strong>SSN Info</strong>
            <small>{t(lang, 'appName')}</small>
          </div>
          <button type="button" className="menu-close" aria-label="Close menu" onClick={closeMenu}>
            ×
          </button>
        </div>

        <div className="side-shop">
          <span className="side-label">{t(lang, 'shop')}</span>
          {shops?.length > 1 ? (
            <select
              className="side-select"
              value={prefs.activeShopId || shop?.id || 'shop'}
              onChange={(e) => switchShop(e.target.value)}
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>{shop?.name}</strong>
          )}
        </div>

        <nav onClick={closeMenu}>
          <NavLink to="/" end>
            {t(lang, 'dashboard')}
          </NavLink>
          <NavLink to="/estimates/new">{t(lang, 'newBill')}</NavLink>
          <NavLink to="/estimates">{t(lang, 'allBills')}</NavLink>
          <NavLink to="/customers">{t(lang, 'customers')}</NavLink>
          <NavLink to="/products">{t(lang, 'products')}</NavLink>
          <NavLink to="/reports">{t(lang, 'reports')}</NavLink>
          <NavLink to="/settings">{t(lang, 'settings')}</NavLink>
        </nav>

        <div className="side-foot">
          <span className={`db-pill ${busy ? 'busy' : ''}`}>
            {busy ? t(lang, 'saving') : t(lang, 'dbSynced')}
          </span>
          {prefs?.pin ? (
            <button type="button" className="btn ghost lock-btn" onClick={lockNow}>
              Lock
            </button>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estimates" element={<EstimatesList />} />
          <Route path="/estimates/new" element={<EstimateEditor />} />
          <Route path="/estimates/:id" element={<EstimateEditor />} />
          <Route path="/estimates/:id/print" element={<PrintEstimate />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
