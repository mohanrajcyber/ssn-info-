import { useRef, useState } from 'react'
import { defaultShop } from '../data/seed'
import { useData } from '../data/DataContext'
import { t } from '../i18n'
import { backupOverdue } from '../utils/helpers'

export default function Settings() {
  const {
    shop,
    shops,
    prefs,
    saveShop,
    savePrefs,
    exportBackup,
    importBackup,
    resetSeed,
    addShopProfile,
    removeShopProfile,
    switchShop,
    busy,
  } = useData()
  const lang = prefs?.language || 'en'
  const [form, setForm] = useState(() => ({ ...shop }))
  const [pin, setPin] = useState(prefs?.pin || '')
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)
  const logoRef = useRef(null)

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  async function onSubmit(e) {
    e.preventDefault()
    await saveShop(form)
    flash('Shop saved')
  }

  async function onExport() {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `srt-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('Backup downloaded')
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      if (!confirm('Replace all database data?')) {
        e.target.value = ''
        return
      }
      await importBackup(json)
      setForm({ ...(json.shop || defaultShop) })
      flash('Imported')
    } catch (err) {
      alert(err?.message || 'Import failed')
    }
    e.target.value = ''
  }

  async function onLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 800_000) {
      alert('Logo too large (max ~800KB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, logoDataUrl: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  async function savePin() {
    await savePrefs({ pin: pin.trim() })
    flash(pin.trim() ? 'PIN saved' : 'PIN cleared')
  }

  async function addGodown() {
    const name = prompt('Shop / Godown name?')
    if (!name) return
    const row = await addShopProfile({ name })
    await switchShop(row.id)
    setForm({ ...row })
    flash('Shop profile added')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">System</p>
          <h1>{t(lang, 'settings')}</h1>
          <p>Theme · Tamil · PIN · logo · multi-shop · backup</p>
        </div>
        {toast && <span className="toast">{toast}</span>}
      </div>

      {backupOverdue(prefs?.lastBackupAt) && (
        <div className="banner warn">{t(lang, 'backupDue')}</div>
      )}

      <div className="stack">
        <div className="card">
          <h2 className="card-title">Preferences</h2>
          <div className="form-grid three">
            <div className="field">
              <label>{t(lang, 'language')}</label>
              <select
                value={prefs.language || 'en'}
                onChange={(e) => savePrefs({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="ta">தமிழ்</option>
              </select>
            </div>
            <div className="field">
              <label>{t(lang, 'theme')}</label>
              <select value={prefs.theme || 'light'} onChange={(e) => savePrefs({ theme: e.target.value })}>
                <option value="light">{t(lang, 'light')}</option>
                <option value="dark">{t(lang, 'dark')}</option>
              </select>
            </div>
            <div className="field">
              <label>Default print</label>
              <select
                value={prefs.printSize || 'a4'}
                onChange={(e) => savePrefs({ printSize: e.target.value })}
              >
                <option value="a4">A4</option>
                <option value="thermal">Thermal 80mm</option>
              </select>
            </div>
            <div className="field">
              <label>App PIN (optional)</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 1234" />
            </div>
            <div className="field" style={{ alignSelf: 'end' }}>
              <button type="button" className="btn secondary" onClick={savePin}>
                Save PIN
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2 className="card-title" style={{ margin: 0 }}>
              Multi shop / godown
            </h2>
            <button type="button" className="btn secondary" onClick={addGodown}>
              + Add shop
            </button>
          </div>
          <div className="btn-row" style={{ marginBottom: 12 }}>
            {shops.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`btn secondary ${prefs.activeShopId === s.id || (!prefs.activeShopId && s.id === 'shop') ? 'active-toggle' : ''}`}
                onClick={async () => {
                  await switchShop(s.id)
                  setForm({ ...s })
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          {shops
            .filter((s) => s.id !== 'shop')
            .map((s) => (
              <button key={`del-${s.id}`} type="button" className="btn danger" onClick={() => removeShopProfile(s.id)}>
                Delete {s.name}
              </button>
            ))}
        </div>

        <div className="card" style={{ maxWidth: 760 }}>
          <h2 className="card-title">Shop profile</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field full">
              <label>Shop name</label>
              <input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field full">
              <label>Address</label>
              <textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>GSTIN</label>
              <input value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </div>
            <div className="field">
              <label>State</label>
              <input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="field">
              <label>Estimate prefix</label>
              <input
                value={form.estimatePrefix || ''}
                onChange={(e) => setForm({ ...form, estimatePrefix: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Invoice prefix</label>
              <input
                value={form.invoicePrefix || 'INV'}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
              />
            </div>
            <div className="field">
              <label>FY code</label>
              <input
                value={form.financialYear || ''}
                onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Low stock alert at</label>
              <input
                type="number"
                value={form.lowStockAt ?? 10}
                onChange={(e) => setForm({ ...form, lowStockAt: Number(e.target.value) })}
              />
            </div>
            <div className="field full">
              <label>Logo (bill header)</label>
              <div className="btn-row">
                <button type="button" className="btn secondary" onClick={() => logoRef.current?.click()}>
                  Upload logo
                </button>
                {form.logoDataUrl && (
                  <>
                    <img src={form.logoDataUrl} alt="" className="logo-preview" />
                    <button type="button" className="btn danger" onClick={() => setForm({ ...form, logoDataUrl: '' })}>
                      Remove
                    </button>
                  </>
                )}
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogo} />
              </div>
            </div>
            <div className="field full btn-row">
              <button className="btn" type="submit" disabled={busy}>
                Save shop
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Backup & restore</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Last backup: {prefs?.lastBackupAt ? new Date(prefs.lastBackupAt).toLocaleString() : 'Never'}
          </p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={onExport} disabled={busy}>
              Download backup JSON
            </button>
            <button type="button" className="btn secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              Import backup
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (confirm('Reset all to seed?')) {
                  await resetSeed()
                  setForm({ ...defaultShop })
                  flash('Reset done')
                }
              }}
              disabled={busy}
            >
              Reset seed
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          </div>
        </div>
      </div>
    </div>
  )
}
