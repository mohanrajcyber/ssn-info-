const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ones[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return `${tens[t]}${o ? ` ${ones[o]}` : ''}`
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h && rest) return `${ones[h]} Hundred ${twoDigits(rest)}`
  if (h) return `${ones[h]} Hundred`
  return twoDigits(rest)
}

/** Convert integer rupees to Indian English words (crore/lakh). */
export function amountInWords(rupees) {
  let n = Math.round(Number(rupees) || 0)
  if (n === 0) return 'Zero Rupees only'
  if (n < 0) return `Minus ${amountInWords(-n)}`

  const parts = []
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundred = n

  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`)
  if (hundred) parts.push(threeDigits(hundred))

  return `${parts.join(' ')} Rupees only`
}
