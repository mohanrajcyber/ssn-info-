import { fromPaise } from './money'

/** Intra-state → CGST+SGST; else IGST (full GST). */
export function isIntraState(shopState, placeOfSupply) {
  const a = String(shopState || '').trim().toLowerCase()
  const b = String(placeOfSupply || '').trim().toLowerCase()
  if (!a || !b) return true
  return a === b || a.includes('tamil') && b.includes('tamil')
}

export function splitGstPaise(gstPaise) {
  const g = Number(gstPaise) || 0
  const cgst = Math.floor(g / 2)
  return { cgstPaise: cgst, sgstPaise: g - cgst, igstPaise: 0 }
}

export function taxBreakup(gstPaise, intra) {
  if (intra) {
    const { cgstPaise, sgstPaise } = splitGstPaise(gstPaise)
    return { cgstPaise, sgstPaise, igstPaise: 0, mode: 'cgst_sgst' }
  }
  return { cgstPaise: 0, sgstPaise: 0, igstPaise: gstPaise, mode: 'igst' }
}

/** Group lines by HSN for GST summary table */
export function hsnSummary(lines) {
  const map = new Map()
  for (const line of lines) {
    const hsn = String(line.hsn || '—').trim() || '—'
    const rate = Number(line.gstPercent) || 0
    const key = `${hsn}|${rate}`
    const prev = map.get(key) || {
      hsn,
      rate,
      taxablePaise: 0,
      gstPaise: 0,
    }
    prev.taxablePaise += line.taxablePaise || 0
    prev.gstPaise += line.gstPaise || 0
    map.set(key, prev)
  }
  return [...map.values()].map((r) => ({
    ...r,
    taxable: fromPaise(r.taxablePaise),
    gst: fromPaise(r.gstPaise),
    ...splitGstPaise(r.gstPaise),
  }))
}
