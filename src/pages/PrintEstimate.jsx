import { Link, useParams } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { t } from '../i18n'
import { calcLineItem, formatINR, formatINRPlain, fromPaise, toPaise } from '../utils/money'
import { amountInWords } from '../utils/numberToWords'
import { hsnSummary, isIntraState } from '../utils/tax'
import { buildWhatsAppText, openWhatsApp } from '../utils/helpers'

export default function PrintEstimate() {
  const { id } = useParams()
  const { shop, prefs, getEstimate, savePrefs } = useData()
  const lang = prefs?.language || 'en'
  const estimate = getEstimate(id)
  const printSize = prefs?.printSize || 'a4'

  if (!estimate) {
    return (
      <div className="page">
        <div className="card empty">
          Bill not found. <Link to="/estimates">Back</Link>
        </div>
      </div>
    )
  }

  const lines = estimate.lines.map((line) => ({
    ...line,
    ...calcLineItem({
      quantity: line.quantity,
      price: line.price,
      gstPercent: line.gstPercent,
    }),
  }))

  const trow = estimate.totals
  const words = estimate.amountInWords || amountInWords(fromPaise(trow.grandTotalPaise))
  const intra = (trow.taxMode || '') === 'cgst_sgst' || isIntraState(shop.state, estimate.placeOfSupply)
  const hsn = hsnSummary(lines)
  const title = estimate.docType === 'invoice' ? 'Tax Invoice' : 'Estimate'

  function setPrintSize(size) {
    savePrefs({ printSize: size })
  }

  function doPrint() {
    document.body.classList.toggle('thermal-print', printSize === 'thermal')
    window.print()
    setTimeout(() => document.body.classList.remove('thermal-print'), 500)
  }

  function shareWa() {
    const text = buildWhatsAppText(shop, estimate)
    openWhatsApp(estimate.customer?.phone, text)
  }

  return (
    <div>
      <div className="print-toolbar no-print page" style={{ maxWidth: '210mm', margin: '1rem auto 0' }}>
        <Link className="btn secondary" to={`/estimates/${id}`}>
          ← Edit
        </Link>
        <button type="button" className={`btn secondary ${printSize === 'a4' ? 'active-toggle' : ''}`} onClick={() => setPrintSize('a4')}>
          {t(lang, 'a4')}
        </button>
        <button type="button" className={`btn secondary ${printSize === 'thermal' ? 'active-toggle' : ''}`} onClick={() => setPrintSize('thermal')}>
          {t(lang, 'thermal')}
        </button>
        <button type="button" className="btn secondary" onClick={shareWa}>
          {t(lang, 'whatsapp')}
        </button>
        <button type="button" className="btn" onClick={doPrint}>
          {t(lang, 'printPdf')}
        </button>
      </div>

      <div className={`print-page ${printSize === 'thermal' ? 'thermal' : ''}`}>
        <div className="print-header">
          <div className="print-brand-row">
            {shop.logoDataUrl ? <img src={shop.logoDataUrl} alt="" className="print-logo" /> : null}
            <div>
              <h1 className="print-shop-name">{shop.name}</h1>
              <div>{shop.address}</div>
              <div>
                Mobile: {shop.phone}
                {shop.email ? ` · Email: ${shop.email}` : ''}
              </div>
              <div>
                GSTIN: {shop.gstin} · State: {shop.state}
              </div>
            </div>
          </div>
          <div className="print-meta">
            <h2>{title}</h2>
            <div>
              <strong>No.:</strong> {estimate.estimateNo}
            </div>
            <div>
              <strong>Date:</strong> {estimate.date}
            </div>
            <div>
              <strong>Place of supply:</strong> {estimate.placeOfSupply}
            </div>
            <div>
              <strong>Payment:</strong> {estimate.paymentStatus || 'paid'}
            </div>
          </div>
        </div>

        <div className="print-customer">
          <h3>{estimate.docType === 'invoice' ? 'Bill To' : 'Estimate For'}</h3>
          <div>
            <strong>{estimate.customer?.name}</strong>
          </div>
          <div>{estimate.customer?.address}</div>
          <div>
            {estimate.customer?.phone ? `Contact No.: ${estimate.customer.phone}` : ''}
            {estimate.customer?.gstin ? ` · GSTIN: ${estimate.customer.gstin}` : ''}
          </div>
        </div>

        <table className="print-table">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Item name</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Taxable</th>
              <th>GST</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.key || i}>
                <td className="center">{i + 1}</td>
                <td className="item-name">{line.name}</td>
                <td className="center">{line.hsn || ''}</td>
                <td className="num">{line.quantity}</td>
                <td className="center">{line.unit}</td>
                <td className="num">{formatINRPlain(toPaise(line.price))}</td>
                <td className="num">{formatINRPlain(line.taxablePaise)}</td>
                <td className="num gst-cell">
                  {formatINRPlain(line.gstPaise)}
                  <span className="gst-pct"> ({line.gstPercent}%)</span>
                </td>
                <td className="num">{formatINRPlain(line.amountPaise)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="center">
                <strong>Total</strong>
              </td>
              <td className="num">
                <strong>{trow.totalQty}</strong>
              </td>
              <td colSpan={2}></td>
              <td className="num">
                <strong>{formatINRPlain(trow.taxablePaise)}</strong>
              </td>
              <td className="num">
                <strong>{formatINRPlain(trow.gstPaise)}</strong>
              </td>
              <td className="num">
                <strong>{formatINRPlain(trow.subTotalPaise)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="print-footer">
          <div>
            <strong>Amount in Words</strong>
            <div>{words}</div>

            {estimate.docType === 'invoice' && (
              <div style={{ marginTop: 10 }}>
                <strong>HSN Summary</strong>
                <table className="print-table" style={{ marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th>HSN</th>
                      <th>Rate</th>
                      <th>Taxable</th>
                      {intra ? (
                        <>
                          <th>CGST</th>
                          <th>SGST</th>
                        </>
                      ) : (
                        <th>IGST</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {hsn.map((r) => (
                      <tr key={`${r.hsn}-${r.rate}`}>
                        <td className="center">{r.hsn}</td>
                        <td className="center">{r.rate}%</td>
                        <td className="num">{formatINRPlain(r.taxablePaise)}</td>
                        {intra ? (
                          <>
                            <td className="num">{formatINRPlain(r.cgstPaise)}</td>
                            <td className="num">{formatINRPlain(r.sgstPaise)}</td>
                          </>
                        ) : (
                          <td className="num">{formatINRPlain(r.gstPaise)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="print-summary">
            <div className="row">
              <span>Taxable</span>
              <span>{formatINR(trow.taxablePaise)}</span>
            </div>
            {intra ? (
              <>
                <div className="row">
                  <span>CGST</span>
                  <span>{formatINR(trow.cgstPaise ?? Math.floor((trow.gstPaise || 0) / 2))}</span>
                </div>
                <div className="row">
                  <span>SGST</span>
                  <span>{formatINR(trow.sgstPaise ?? (trow.gstPaise || 0) - Math.floor((trow.gstPaise || 0) / 2))}</span>
                </div>
              </>
            ) : (
              <div className="row">
                <span>IGST</span>
                <span>{formatINR(trow.igstPaise ?? trow.gstPaise)}</span>
              </div>
            )}
            <div className="row">
              <span>Sub Total</span>
              <span>{formatINR(trow.subTotalPaise)}</span>
            </div>
            <div className="row">
              <span>Round Off</span>
              <span>
                {trow.roundOffPaise >= 0 ? '' : '-'}
                {formatINR(Math.abs(trow.roundOffPaise))}
              </span>
            </div>
            <div className="row grand">
              <span>Total</span>
              <span>{formatINR(trow.grandTotalPaise)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
