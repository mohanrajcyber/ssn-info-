import { formatINR, fromPaise } from './money'

export function buildWhatsAppText(shop, bill) {
  const total = formatINR(bill.totals?.grandTotalPaise || 0)
  const type = bill.docType === 'invoice' ? 'Invoice' : 'Estimate'
  const lines = [
    `*${shop?.name || 'Shop'}*`,
    `${type} No: ${bill.estimateNo || bill.docNo || ''}`,
    `Date: ${bill.date || ''}`,
    `Customer: ${bill.customer?.name || ''}`,
    `Amount: ${total}`,
    bill.amountInWords ? `(${bill.amountInWords})` : '',
    bill.paymentStatus ? `Payment: ${bill.paymentStatus}` : '',
    '',
    'Thank you!',
  ].filter(Boolean)
  return lines.join('\n')
}

export function openWhatsApp(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  let num = digits
  if (num.length === 10) num = `91${num}`
  const url = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function backupOverdue(lastBackupAt, days = 3) {
  if (!lastBackupAt) return true
  const t = new Date(lastBackupAt).getTime()
  if (!Number.isFinite(t)) return true
  return Date.now() - t > days * 24 * 60 * 60 * 1000
}

export function duePaise(bill) {
  const grand = bill.totals?.grandTotalPaise || 0
  const paid = bill.paidPaise || 0
  if (bill.paymentStatus === 'paid') return 0
  if (bill.paymentStatus === 'credit') return grand
  return Math.max(0, grand - paid)
}

export { fromPaise }
