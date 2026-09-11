/**
 * Money math in paise (integer) — avoids float errors like 0.1 + 0.2.
 * 1 rupee = 100 paise.
 */

export function toPaise(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function fromPaise(paise) {
  return (paise || 0) / 100
}

/** Format as Indian currency display: ₹ 1,234.56 */
export function formatINR(paiseOrRupees, { fromRupees = false } = {}) {
  const rupees = fromRupees ? Number(paiseOrRupees) || 0 : fromPaise(paiseOrRupees)
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `₹ ${formatted}`
}

export function formatINRPlain(paise) {
  return fromPaise(paise).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Price is GST-INCLUSIVE (what you type is final rate).
 * Example: Price 100, GST 5%
 *   taxable = 100 × 100/105 ≈ 95.24   (GST remove pannina amount)
 *   gst     = 100 − 95.24 = 4.76
 *   amount  = 100 (inclusive total)
 */
export function calcLineItem({ quantity, price, gstPercent }) {
  const qty = Number(quantity) || 0
  const pricePaise = toPaise(price)
  const rate = Number(gstPercent) || 0

  const inclusivePaise = Math.round(qty * pricePaise)
  if (rate <= 0) {
    return {
      taxablePaise: inclusivePaise,
      gstPaise: 0,
      amountPaise: inclusivePaise,
      taxable: fromPaise(inclusivePaise),
      gst: 0,
      amount: fromPaise(inclusivePaise),
    }
  }

  const taxablePaise = Math.round((inclusivePaise * 100) / (100 + rate))
  const gstPaise = inclusivePaise - taxablePaise
  const amountPaise = inclusivePaise

  return {
    taxablePaise,
    gstPaise,
    amountPaise,
    taxable: fromPaise(taxablePaise),
    gst: fromPaise(gstPaise),
    amount: fromPaise(amountPaise),
  }
}

/**
 * Bill totals + round-off to nearest whole rupee.
 */
export function calcBillTotals(lines) {
  let totalQty = 0
  let taxablePaise = 0
  let gstPaise = 0
  let amountPaise = 0

  for (const line of lines) {
    const qty = Number(line.quantity) || 0
    totalQty += qty
    const calc = calcLineItem({
      quantity: qty,
      price: line.price,
      gstPercent: line.gstPercent,
    })
    taxablePaise += calc.taxablePaise
    gstPaise += calc.gstPaise
    amountPaise += calc.amountPaise
  }

  // Round off to nearest ₹1
  const grandPaise = Math.round(amountPaise / 100) * 100
  const roundOffPaise = grandPaise - amountPaise

  return {
    totalQty,
    taxablePaise,
    gstPaise,
    subTotalPaise: amountPaise,
    roundOffPaise,
    grandTotalPaise: grandPaise,
    taxable: fromPaise(taxablePaise),
    gst: fromPaise(gstPaise),
    subTotal: fromPaise(amountPaise),
    roundOff: fromPaise(roundOffPaise),
    grandTotal: fromPaise(grandPaise),
  }
}
