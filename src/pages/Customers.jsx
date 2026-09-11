import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'

const empty = { name: '', address: '', phone: '', gstin: '', state: '33-Tamil Nadu' }

export default function Customers() {
  const { customers, upsertCustomer, deleteCustomer } = useData()
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [q, setQ] = useState('')
  const [toast, setToast] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.gstin?.toLowerCase().includes(s),
    )
  }, [customers, q])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return alert('Customer name required')
    await upsertCustomer({ id: editId || undefined, ...form, name: form.name.trim() })
    flash(editId ? 'Customer updated' : 'Customer saved to DB')
    setForm(empty)
    setEditId(null)
  }

  function startEdit(c) {
    setEditId(c.id)
    setForm({
      name: c.name || '',
      address: c.address || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      state: c.state || '33-Tamil Nadu',
    })
  }

  async function remove(id) {
    if (!confirm('Delete customer from database?')) return
    await deleteCustomer(id)
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
          <h1>Customers</h1>
          <p>Stored in IndexedDB · loaded into memory for instant search</p>
        </div>
        {toast && <span className="toast">{toast}</span>}
      </div>

      <div className="stack">
        <div className="card">
          <h2 className="card-title">{editId ? 'Edit customer' : 'Add customer'}</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field full">
              <label>Address</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>GSTIN</label>
              <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </div>
            <div className="field">
              <label>State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="field full btn-row">
              <button className="btn" type="submit">
                {editId ? 'Update in DB' : 'Save to DB'}
              </button>
              {editId && (
                <button
                  className="btn secondary"
                  type="button"
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
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name / phone / GSTIN" />
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="muted small">{c.address}</div>
                    </td>
                    <td>{c.phone || '—'}</td>
                    <td className="mono">{c.gstin || '—'}</td>
                    <td>
                      <div className="btn-row end">
                        <button type="button" className="btn secondary" onClick={() => startEdit(c)}>
                          Edit
                        </button>
                        <button type="button" className="btn danger" onClick={() => remove(c.id)}>
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
