import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { formatINR, toPaise } from '../utils/money'

const empty = { name: '', hsn: '', unit: 'SARAM', price: '', gstPercent: 5, stockQty: 100, trackStock: true }

export default function Products() {
  const { products, upsertProduct, deleteProduct } = useData()
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [q, setQ] = useState('')
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return products
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.hsn?.includes(s))
  }, [products, q])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Item name required')
    const row = {
      id: editId || undefined,
      name: form.name.trim(),
      hsn: form.hsn.trim(),
      unit: form.unit.trim() || 'SARAM',
      price: Number(form.price) || 0,
      gstPercent: Number(form.gstPercent) || 0,
      stockQty: Number(form.stockQty) || 0,
      trackStock: form.trackStock !== false,
    }
    await upsertProduct(row)
    flash(editId ? 'Product updated' : 'Product saved to DB')
    setForm(empty)
    setEditId(null)
  }

  function startEdit(p) {
    setEditId(p.id)
    setForm({
      name: p.name || '',
      hsn: p.hsn || '',
      unit: p.unit || 'SARAM',
      price: p.price ?? '',
      gstPercent: p.gstPercent ?? 5,
      stockQty: p.stockQty ?? 0,
      trackStock: p.trackStock !== false,
    })
  }

  async function remove(id) {
    if (!confirm('Delete product from database?')) return
    await deleteProduct(id)
    if (editId === id) {
      setEditId(null)
      setForm(empty)
    }
    flash('Deleted')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Master data</p>
          <h1>Products</h1>
          <p>HSN · unit · price · GST% — durable in database</p>
        </div>
        {toast && <span className="toast">{toast}</span>}
      </div>

      <div className="stack">
        <div className="card">
          <h2 className="card-title">{editId ? 'Edit product' : 'Add product'}</h2>
          <form className="form-grid three" onSubmit={onSubmit}>
            <div className="field full">
              <label>Item name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>HSN / SAC</label>
              <input value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
            </div>
              <div className="field">
              <label>Unit</label>
              <select value={form.unit === 'Kg' ? 'Kg' : 'SARAM'} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="Kg">Kg</option>
                <option value="SARAM">SARAM</option>
              </select>
            </div>
            <div className="field">
              <label>Price / Unit (GST include)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>GST %</label>
              <select
                value={String(form.gstPercent ?? 5)}
                onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Stock qty</label>
              <input
                type="number"
                step="any"
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Track stock</label>
              <select
                value={form.trackStock ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, trackStock: e.target.value === 'yes' })}
              >
                <option value="yes">Yes (deduct on Invoice)</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="field full btn-row">
              <button className="btn" type="submit">
                {editId ? 'Update in DB' : 'Save to DB'}
              </button>
              {editId && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setEditId(null)
                    setForm(empty)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="toolbar">
            <div className="field grow">
              <label>Search memory</label>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Item / HSN" />
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>HSN</th>
                  <th>Unit</th>
                  <th className="num">Stock</th>
                  <th className="num">Price</th>
                  <th className="num">GST %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="mono">{p.hsn || '—'}</td>
                    <td>{p.unit}</td>
                    <td className="num">{p.trackStock === false ? '—' : p.stockQty ?? 0}</td>
                    <td className="num">{formatINR(toPaise(p.price))}</td>
                    <td className="num">{p.gstPercent}%</td>
                    <td>
                      <div className="btn-row end">
                        <button type="button" className="btn secondary" onClick={() => startEdit(p)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger" onClick={() => remove(p.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
