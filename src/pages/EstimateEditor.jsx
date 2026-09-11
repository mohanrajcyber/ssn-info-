import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { todayGB, uid } from '../data/seed'
import { t } from '../i18n'
import { calcBillTotals, calcLineItem, formatINR, formatINRPlain, toPaise } from '../utils/money'
import { amountInWords } from '../utils/numberToWords'
import { isIntraState, taxBreakup } from '../utils/tax'

function blankLine() {
  return {
    key: uid('line'),
    productId: '',
    name: '',
    hsn: '',
    quantity: 1,
    unit: 'SARAM',
    price: '',
    gstPercent: 5,
  }
}

function isLineComplete(line) {
  return (
    Boolean(String(line?.name || '').trim()) &&
    Number(line?.quantity) > 0 &&
    line?.price !== '' &&
    Number(line?.price) >= 0
  )
}

function isLineSavable(line) {
  return (
    Boolean(String(line?.name || '').trim()) &&
    Number(line?.quantity) > 0 &&
    line?.price !== '' &&
    Number.isFinite(Number(line?.price))
  )
}

function isLineBlank(line) {
  return !String(line?.name || '').trim() && (line?.price === '' || line?.price == null) && !line?.productId
}

function withTrailingBlank(list) {
  if (!list.length) return [blankLine()]
  const last = list[list.length - 1]
  if (isLineComplete(last)) return [...list, blankLine()]
  let end = list.length
  while (end > 1 && isLineBlank(list[end - 1]) && isLineBlank(list[end - 2])) end -= 1
  return end === list.length ? list : list.slice(0, end)
}

function handleEnterNav(e) {
  if (e.key !== 'Enter' || e.shiftKey) return
  const target = e.target
  if (!target?.matches?.('input, select')) return
  e.preventDefault()
  const root = target.closest('tr') || target.closest('.card') || document
  const fields = [...root.querySelectorAll('input:not([type=hidden]), select')].filter(
    (el) => !el.disabled && el.offsetParent !== null,
  )
  const idx = fields.indexOf(target)
  if (idx >= 0 && idx < fields.length - 1) {
    fields[idx + 1].focus()
    fields[idx + 1].select?.()
  } else {
    const nextRow = target.closest('tr')?.nextElementSibling
    const next = nextRow?.querySelector('select, input')
    next?.focus()
  }
}

export default function EstimateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { customers, products, shop, prefs, getEstimate, upsertEstimate } = useData()
  const lang = prefs?.language || 'en'
  const isNew = !id || id === 'new'
  const existing = isNew ? null : getEstimate(id)

  const [docType, setDocType] = useState('estimate')
  const [estimateNo, setEstimateNo] = useState('')
  const [date, setDate] = useState(todayGB())
  const [placeOfSupply, setPlaceOfSupply] = useState(shop?.state || '33-Tamil Nadu')
  const [customerId, setCustomerId] = useState(customers[0]?.id || '')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [paidAmount, setPaidAmount] = useState('')
  const [lines, setLines] = useState([blankLine()])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!existing) {
      setDocType('estimate')
      setEstimateNo('')
      setDate(todayGB())
      setPlaceOfSupply(shop?.state || '33-Tamil Nadu')
      setCustomerId(customers[0]?.id || '')
      setPaymentStatus('paid')
      setPaidAmount('')
      setLines([blankLine()])
      return
    }
    setDocType(existing.docType || 'estimate')
    setEstimateNo(existing.estimateNo || '')
    setDate(existing.date || todayGB())
    setPlaceOfSupply(existing.placeOfSupply || shop?.state || '')
    setCustomerId(existing.customer?.id || '')
    setPaymentStatus(existing.paymentStatus || 'paid')
    setPaidAmount(
      existing.paidPaise != null ? String(fromPaiseSafe(existing.paidPaise)) : '',
    )
    setLines(
      withTrailingBlank(
        existing.lines?.length
          ? existing.lines.map((l) => ({ ...l, key: l.key || uid('line') }))
          : [blankLine()],
      ),
    )
  }, [existing, shop, customers])

  const customer = customers.find((c) => c.id === customerId) || null

  const enrichedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        ...calcLineItem({
          quantity: line.quantity,
          price: line.price,
          gstPercent: line.gstPercent,
        }),
      })),
    [lines],
  )

  const savableLines = useMemo(() => enrichedLines.filter(isLineSavable), [enrichedLines])
  const totals = useMemo(() => calcBillTotals(savableLines), [savableLines])
  const words = amountInWords(totals.grandTotal)
  const intra = isIntraState(shop?.state, placeOfSupply)
  const tax = taxBreakup(totals.gstPaise, intra)

  function updateLine(key, patch) {
    setLines((prev) => withTrailingBlank(prev.map((l) => (l.key === key ? { ...l, ...patch } : l))))
  }

  function pickProduct(key, productId) {
    const p = products.find((x) => x.id === productId)
    if (!p) {
      updateLine(key, { productId: '' })
      return
    }
    updateLine(key, {
      productId: p.id,
      name: p.name,
      hsn: p.hsn || '',
      unit: p.unit || 'SARAM',
      price: p.price ?? '',
      gstPercent: p.gstPercent ?? 5,
    })
  }

  function removeLine(key) {
    setLines((prev) => {
      const next = prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)
      return withTrailingBlank(next.length ? next : [blankLine()])
    })
  }

  function buildDraft() {
    if (!customer) {
      alert('Select a customer')
      return null
    }
    if (savableLines.length === 0) {
      alert('Add at least one item')
      return null
    }

    let paidPaise = 0
    if (paymentStatus === 'paid') paidPaise = totals.grandTotalPaise
    else if (paymentStatus === 'partial') paidPaise = toPaise(paidAmount)
    else paidPaise = 0

    return {
      id: existing?.id,
      docType,
      estimateNo: estimateNo || undefined,
      date,
      placeOfSupply,
      paymentStatus,
      paidPaise,
      stockApplied: existing?.stockApplied || false,
      customer: { ...customer },
      lines: savableLines.map(({ taxable, gst, amount, taxablePaise, gstPaise, amountPaise, ...rest }) => ({
        ...rest,
        taxablePaise,
        gstPaise,
        amountPaise,
      })),
      totals: {
        totalQty: totals.totalQty,
        taxablePaise: totals.taxablePaise,
        gstPaise: totals.gstPaise,
        cgstPaise: tax.cgstPaise,
        sgstPaise: tax.sgstPaise,
        igstPaise: tax.igstPaise,
        subTotalPaise: totals.subTotalPaise,
        roundOffPaise: totals.roundOffPaise,
        grandTotalPaise: totals.grandTotalPaise,
        taxMode: tax.mode,
      },
      amountInWords: words,
    }
  }

  async function save(andPrint = false) {
    const draft = buildDraft()
    if (!draft) return
    setSaving(true)
    try {
      const allocateNo = !draft.estimateNo
      const saved = await upsertEstimate(draft, { allocateNo })
      setEstimateNo(saved.estimateNo)
      setToast(`Saved ${saved.estimateNo}`)
      if (andPrint) navigate(`/estimates/${saved.id}/print`)
      else navigate(`/estimates/${saved.id}`, { replace: true })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 2000)
    }
  }

  if (!isNew && !existing) {
    return (
      <div className="page">
        <div className="card empty">
          <h3>Bill not found</h3>
          <Link className="btn" to="/estimates">
            Back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page wide" onKeyDown={handleEnterNav}>
      <div className="page-header">
        <div>
          <p className="eyebrow">{existing ? 'Edit' : 'Create'}</p>
          <h1>{docType === 'invoice' ? t(lang, 'invoice') : t(lang, 'estimate')}</h1>
          <p>Enter = next field · auto next line · incomplete row skipped on save</p>
        </div>
        <div className="btn-row">
          {toast && <span className="toast">{toast}</span>}
          <button type="button" className="btn secondary" disabled={saving} onClick={() => save(false)}>
            {saving ? t(lang, 'saving') : t(lang, 'saveDb')}
          </button>
          <button type="button" className="btn" disabled={saving} onClick={() => save(true)}>
            {t(lang, 'savePrint')}
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="card split-2">
          <div>
            <h2 className="card-title">Estimate For</h2>
            <div className="form-grid">
              <div className="field full">
                <label>Customer</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {customer && (
              <div className="info-block">
                <div>{customer.address}</div>
                <div className="muted">
                  {customer.phone && <>Ph: {customer.phone} · </>}
                  GSTIN: {customer.gstin || '—'}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="card-title">Document</h2>
            <div className="form-grid">
              <div className="field">
                <label>Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="estimate">{t(lang, 'estimate')}</option>
                  <option value="invoice">{t(lang, 'invoice')}</option>
                </select>
              </div>
              <div className="field">
                <label>No</label>
                <input
                  value={estimateNo}
                  onChange={(e) => setEstimateNo(e.target.value)}
                  placeholder="Auto on save"
                  className="mono"
                />
              </div>
              <div className="field">
                <label>Date</label>
                <input value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Place of supply</label>
                <input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
              </div>
              <div className="field">
                <label>{t(lang, 'payment')}</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                  <option value="paid">{t(lang, 'paid')}</option>
                  <option value="credit">{t(lang, 'credit')}</option>
                  <option value="partial">{t(lang, 'partial')}</option>
                </select>
              </div>
              {paymentStatus === 'partial' && (
                <div className="field">
                  <label>Paid amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2 className="card-title" style={{ margin: 0 }}>
              Line items
            </h2>
            <button type="button" className="btn secondary" onClick={() => setLines((p) => withTrailingBlank([...p, blankLine()]))}>
              + Add line
            </button>
          </div>
          <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
            Price = GST include. Ex: 100 @ 5% → Taxable 95.24 (−GST) · GST 4.76 · Amount 100
          </p>

          <div className="table-wrap">
            <table className="data dense">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>HSN</th>
                  <th className="num">Qty</th>
                  <th>Unit</th>
                  <th className="num">Price (incl)</th>
                  <th className="num">GST%</th>
                  <th className="num">Taxable</th>
                  <th className="num">GST Amt</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enrichedLines.map((line, i) => {
                  const prod = products.find((p) => p.id === line.productId)
                  const low =
                    prod &&
                    prod.trackStock !== false &&
                    Number(prod.stockQty) <= Number(shop?.lowStockAt ?? 10)
                  return (
                    <tr key={line.key} className={!isLineSavable(line) && i === enrichedLines.length - 1 ? 'row-draft' : ''}>
                      <td>{i + 1}</td>
                      <td>
                        <select value={line.productId || ''} onChange={(e) => pickProduct(line.key, e.target.value)}>
                          <option value="">Select / custom</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.trackStock !== false ? ` (stk ${p.stockQty ?? 0})` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          value={line.name}
                          onChange={(e) => updateLine(line.key, { name: e.target.value, productId: '' })}
                          placeholder="Item name"
                        />
                        {low && <div className="stock-warn">{t(lang, 'lowStock')}</div>}
                      </td>
                      <td>
                        <input value={line.hsn} onChange={(e) => updateLine(line.key, { hsn: e.target.value })} />
                      </td>
                      <td>
                        <input type="number" step="any" min="0" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} />
                      </td>
                      <td>
                        <select value={line.unit === 'Kg' ? 'Kg' : 'SARAM'} onChange={(e) => updateLine(line.key, { unit: e.target.value })}>
                          <option value="Kg">Kg</option>
                          <option value="SARAM">SARAM</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.price}
                          onChange={(e) => updateLine(line.key, { price: e.target.value })}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <select
                          value={String(line.gstPercent ?? 5)}
                          onChange={(e) => updateLine(line.key, { gstPercent: e.target.value })}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="num mono">{isLineSavable(line) ? formatINRPlain(line.taxablePaise) : '—'}</td>
                      <td className="num mono auto-gst">{isLineSavable(line) ? formatINRPlain(line.gstPaise) : '—'}</td>
                      <td className="num mono strong">{isLineSavable(line) ? formatINRPlain(line.amountPaise) : '—'}</td>
                      <td>
                        <button type="button" className="btn danger icon" onClick={() => removeLine(line.key)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card split-2 totals-card">
          <div className="words">
            <strong>Amount in Words</strong>
            <span>{words}</span>
            <div className="muted small" style={{ marginTop: 8 }}>
              Tax: {intra ? 'CGST + SGST (intra-state)' : 'IGST (inter-state)'}
            </div>
          </div>
          <div className="totals-box">
            <div className="row">
              <span>Taxable</span>
              <span className="mono">{formatINR(totals.taxablePaise)}</span>
            </div>
            {intra ? (
              <>
                <div className="row">
                  <span>CGST</span>
                  <span className="mono">{formatINR(tax.cgstPaise)}</span>
                </div>
                <div className="row">
                  <span>SGST</span>
                  <span className="mono">{formatINR(tax.sgstPaise)}</span>
                </div>
              </>
            ) : (
              <div className="row">
                <span>IGST</span>
                <span className="mono">{formatINR(tax.igstPaise)}</span>
              </div>
            )}
            <div className="row">
              <span>Sub Total</span>
              <span className="mono">{formatINR(totals.subTotalPaise)}</span>
            </div>
            <div className="row">
              <span>Round Off</span>
              <span className="mono">
                {totals.roundOffPaise >= 0 ? '+' : ''}
                {formatINR(totals.roundOffPaise)}
              </span>
            </div>
            <div className="row grand">
              <span>Grand Total</span>
              <span className="mono">{formatINR(totals.grandTotalPaise)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function fromPaiseSafe(p) {
  return (Number(p) || 0) / 100
}
