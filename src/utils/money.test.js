/**
 * Quick sanity checks for money math (run: node src/utils/money.test.js)
 */
import { calcLineItem, calcBillTotals, toPaise } from './money.js'
import { amountInWords } from './numberToWords.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// Inclusive: Price 100 @ 5% → taxable 95.24, GST 4.76, amount 100
const rowInc = calcLineItem({ quantity: 1, price: 100, gstPercent: 5 })
assert(rowInc.amountPaise === 10000, `amount expected 10000 got ${rowInc.amountPaise}`)
assert(rowInc.taxablePaise === 9524, `taxable expected 9524 got ${rowInc.taxablePaise}`)
assert(rowInc.gstPaise === 476, `gst expected 476 got ${rowInc.gstPaise}`)

// Qty 10 × 100 incl @ 5%
const row10 = calcLineItem({ quantity: 10, price: 100, gstPercent: 5 })
assert(row10.amountPaise === 100000, `amount10 expected 100000 got ${row10.amountPaise}`)
assert(row10.taxablePaise === 95238, `taxable10 expected 95238 got ${row10.taxablePaise}`)
assert(row10.gstPaise === 4762, `gst10 expected 4762 got ${row10.gstPaise}`)

// 0% GST: all = price
const row0 = calcLineItem({ quantity: 2, price: 50, gstPercent: 0 })
assert(row0.taxablePaise === 10000 && row0.gstPaise === 0 && row0.amountPaise === 10000)

// Round-off: sub 38494.60 → grand 38495.00 (0% so inclusive=ex)
const totals = calcBillTotals([{ quantity: 1, price: 38494.6, gstPercent: 0 }])
assert(totals.subTotalPaise === 3849460, `sub expected 3849460 got ${totals.subTotalPaise}`)
assert(totals.grandTotalPaise === 3849500, `grand expected 3849500 got ${totals.grandTotalPaise}`)
assert(totals.roundOffPaise === 40, `roundOff expected 40 got ${totals.roundOffPaise}`)
assert(amountInWords(38495) === 'Thirty Eight Thousand Four Hundred Ninety Five Rupees only')

assert(toPaise(0.1 + 0.2) === 30, 'float trap should still round to 30 paise via toPaise')

console.log('All money tests passed ✓')
