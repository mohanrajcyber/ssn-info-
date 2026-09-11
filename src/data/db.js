import Dexie from 'dexie'
import { defaultPrefs, defaultShop, seedCustomers, seedProducts } from './seed'

/**
 * Phase: DATABASE — IndexedDB via Dexie
 */
export class BillingDB extends Dexie {
  constructor() {
    super('SriRamajayamBilling')
    this.version(1).stores({
      shop: 'id',
      customers: 'id, name, phone, gstin',
      products: 'id, name, hsn',
      estimates: 'id, estimateNo, date, customerId, updatedAt',
      meta: 'key',
    })
    this.version(2).stores({
      shop: 'id',
      shops: 'id, name',
      customers: 'id, name, phone, gstin',
      products: 'id, name, hsn',
      estimates: 'id, estimateNo, date, customerId, updatedAt, docType, paymentStatus, shopId',
      meta: 'key',
    })
  }
}

export const db = new BillingDB()

const OLD_KEYS = {
  shop: 'srt_shop',
  customers: 'srt_customers',
  products: 'srt_products',
  estimates: 'srt_estimates',
  counter: 'srt_est_counter',
}

function readLegacy(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearLegacy() {
  Object.values(OLD_KEYS).forEach((k) => localStorage.removeItem(k))
}

export async function bootDatabase() {
  await db.open()

  const metaReady = await db.meta.get('boot')
  if (!metaReady) {
    await migrateFromLocalStorage()
    await seedIfEmpty()
    await db.meta.put({ key: 'boot', at: new Date().toISOString(), version: 2 })
  }

  await ensureV2Defaults()
  await patchProductMrps()
  await patchProductStock()
  await patchShopName()

  return hydrateSnapshot()
}

async function ensureV2Defaults() {
  const prefs = await db.meta.get('prefs')
  if (!prefs) await db.meta.put({ key: 'prefs', value: { ...defaultPrefs } })

  const inv = await db.meta.get('invoiceCounter')
  if (!inv) await db.meta.put({ key: 'invoiceCounter', value: 100 })

  const shop = await db.shop.get('shop')
  if (shop) {
    const merged = { ...defaultShop, ...shop, id: 'shop' }
    if (!shop.invoicePrefix) merged.invoicePrefix = 'INV'
    await db.shop.put(merged)
    const shopsCount = await db.shops.count()
    if (shopsCount === 0) await db.shops.put({ ...merged })
  }
}

async function patchProductMrps() {
  const p1 = await db.products.get('p1')
  if (p1 && (p1.mrp === '' || p1.mrp == null || Number(p1.mrp) === 0)) {
    await db.products.put({ ...p1, mrp: 300, hsn: p1.hsn || '09109100' })
  }
}

/** Rename shop branding if still on old default */
async function patchShopName() {
  const shop = await db.shop.get('shop')
  if (!shop) return
  const oldNames = ['SRI RAMAJAYAM TRADERS', 'SRI RAMAJAYAM TRADERS ']
  if (oldNames.includes(String(shop.name || '').trim())) {
    const next = {
      ...shop,
      name: 'SSN INFO AND ENTERPRISES',
      email:
        shop.email === 'sriramajayamcud@gmail.com' || !shop.email
          ? 'ssninfoandenterprises@gmail.com'
          : shop.email,
    }
    await db.shop.put(next)
    await db.shops.put({ ...next, id: next.id || 'shop' })
  }
}

async function patchProductStock() {
  const all = await db.products.toArray()
  const updates = all.filter((p) => p.stockQty == null).map((p) => ({ ...p, stockQty: 500, trackStock: true }))
  if (updates.length) await db.products.bulkPut(updates)
}

async function migrateFromLocalStorage() {
  const legacyShop = readLegacy(OLD_KEYS.shop)
  const legacyCustomers = readLegacy(OLD_KEYS.customers)
  const legacyProducts = readLegacy(OLD_KEYS.products)
  const legacyEstimates = readLegacy(OLD_KEYS.estimates)
  const legacyCounter = readLegacy(OLD_KEYS.counter)

  const hasLegacy =
    legacyShop ||
    (Array.isArray(legacyCustomers) && legacyCustomers.length) ||
    (Array.isArray(legacyProducts) && legacyProducts.length) ||
    (Array.isArray(legacyEstimates) && legacyEstimates.length)

  if (!hasLegacy) return

  await db.transaction('rw', db.shop, db.shops, db.customers, db.products, db.estimates, db.meta, async () => {
    if (legacyShop) {
      const s = { ...defaultShop, ...legacyShop, id: 'shop' }
      await db.shop.put(s)
      await db.shops.put(s)
    }
    if (Array.isArray(legacyCustomers) && legacyCustomers.length) await db.customers.bulkPut(legacyCustomers)
    if (Array.isArray(legacyProducts) && legacyProducts.length) await db.products.bulkPut(legacyProducts)
    if (Array.isArray(legacyEstimates) && legacyEstimates.length) {
      await db.estimates.bulkPut(
        legacyEstimates.map((e) => ({
          ...e,
          customerId: e.customer?.id || '',
          docType: e.docType || 'estimate',
          paymentStatus: e.paymentStatus || 'paid',
          shopId: 'shop',
        })),
      )
    }
    if (legacyCounter != null) {
      await db.meta.put({ key: 'estimateCounter', value: Number(legacyCounter) || 200 })
    }
  })

  clearLegacy()
}

async function seedIfEmpty() {
  const shopCount = await db.shop.count()
  if (shopCount === 0) {
    await db.shop.put({ ...defaultShop })
    await db.shops.put({ ...defaultShop })
  }

  if ((await db.customers.count()) === 0) await db.customers.bulkPut(seedCustomers)
  if ((await db.products.count()) === 0) await db.products.bulkPut(seedProducts)
  if (!(await db.meta.get('estimateCounter'))) await db.meta.put({ key: 'estimateCounter', value: 200 })
  if (!(await db.meta.get('invoiceCounter'))) await db.meta.put({ key: 'invoiceCounter', value: 100 })
  if (!(await db.meta.get('prefs'))) await db.meta.put({ key: 'prefs', value: { ...defaultPrefs } })
}

export async function hydrateSnapshot() {
  const [shopRow, shops, customers, products, estimates, estCounter, invCounter, prefsRow] =
    await Promise.all([
      db.shop.get('shop'),
      db.shops.toArray(),
      db.customers.toArray(),
      db.products.toArray(),
      db.estimates.orderBy('updatedAt').reverse().toArray(),
      db.meta.get('estimateCounter'),
      db.meta.get('invoiceCounter'),
      db.meta.get('prefs'),
    ])

  const prefs = { ...defaultPrefs, ...(prefsRow?.value || {}) }
  let shop = shopRow || { ...defaultShop }
  if (prefs.activeShopId && prefs.activeShopId !== 'shop') {
    const alt = shops.find((s) => s.id === prefs.activeShopId)
    if (alt) shop = alt
  }

  return {
    shop,
    shops: shops.length ? shops : [{ ...shop }],
    customers: customers.sort((a, b) => a.name.localeCompare(b.name)),
    products: products.sort((a, b) => a.name.localeCompare(b.name)),
    estimates,
    estimateCounter: estCounter?.value ?? 200,
    invoiceCounter: invCounter?.value ?? 100,
    prefs,
  }
}

export async function dbSaveShop(shop) {
  const row = { ...defaultShop, ...shop, id: 'shop' }
  await db.shop.put(row)
  await db.shops.put(row)
}

export async function dbUpsertShopProfile(shop) {
  const row = { ...defaultShop, ...shop, id: shop.id || `shop_${Date.now()}` }
  await db.shops.put(row)
  if (row.id === 'shop') await db.shop.put(row)
  return row
}

export async function dbDeleteShopProfile(id) {
  if (id === 'shop') throw new Error('Cannot delete primary shop')
  await db.shops.delete(id)
}

export async function dbSavePrefs(prefs) {
  await db.meta.put({ key: 'prefs', value: { ...defaultPrefs, ...prefs } })
}

export async function dbUpsertCustomer(customer) {
  await db.customers.put(customer)
}

export async function dbDeleteCustomer(id) {
  await db.customers.delete(id)
}

export async function dbUpsertProduct(product) {
  await db.products.put(product)
}

export async function dbDeleteProduct(id) {
  await db.products.delete(id)
}

export async function dbUpsertEstimate(estimate) {
  await db.estimates.put({
    ...estimate,
    customerId: estimate.customer?.id || '',
    shopId: estimate.shopId || 'shop',
  })
}

export async function dbDeleteEstimate(id) {
  await db.estimates.delete(id)
}

export async function dbNextDocNo(shop, docType = 'estimate') {
  const key = docType === 'invoice' ? 'invoiceCounter' : 'estimateCounter'
  const prefix =
    docType === 'invoice' ? shop.invoicePrefix || 'INV' : shop.estimatePrefix || 'EST'
  return db.transaction('rw', db.meta, async () => {
    const row = (await db.meta.get(key)) || { key, value: docType === 'invoice' ? 100 : 200 }
    const next = (Number(row.value) || 0) + 1
    await db.meta.put({ key, value: next })
    return {
      docNo: `${prefix}${shop.financialYear || ''}/${next}`,
      counter: next,
      key,
    }
  })
}

/** Deduct stock for invoice lines (once). Returns updated products. */
export async function dbApplyStock(lines, { reverse = false } = {}) {
  const factor = reverse ? 1 : -1
  const updated = []
  await db.transaction('rw', db.products, async () => {
    for (const line of lines) {
      if (!line.productId) continue
      const p = await db.products.get(line.productId)
      if (!p || p.trackStock === false) continue
      const qty = Number(line.quantity) || 0
      const next = {
        ...p,
        stockQty: Math.max(0, (Number(p.stockQty) || 0) + factor * qty),
      }
      await db.products.put(next)
      updated.push(next)
    }
  })
  return updated
}

export async function dbExportAll() {
  const snap = await hydrateSnapshot()
  const exportedAt = new Date().toISOString()
  await db.meta.put({
    key: 'prefs',
    value: { ...snap.prefs, lastBackupAt: exportedAt },
  })
  return {
    app: 'SriRamajayamBilling',
    exportedAt,
    ...snap,
    prefs: { ...snap.prefs, lastBackupAt: exportedAt },
  }
}

export async function dbImportAll(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid backup file')

  await db.transaction('rw', db.shop, db.shops, db.customers, db.products, db.estimates, db.meta, async () => {
    await Promise.all([db.shop.clear(), db.shops.clear(), db.customers.clear(), db.products.clear(), db.estimates.clear()])

    if (payload.shop) {
      const s = { ...defaultShop, ...payload.shop, id: payload.shop.id || 'shop' }
      await db.shop.put({ ...s, id: 'shop' })
      await db.shops.put(s.id === 'shop' ? s : { ...s })
    } else await db.shop.put({ ...defaultShop })

    if (Array.isArray(payload.shops) && payload.shops.length) await db.shops.bulkPut(payload.shops)
    else if (payload.shop) await db.shops.put({ ...defaultShop, ...payload.shop, id: 'shop' })

    if (Array.isArray(payload.customers)) await db.customers.bulkPut(payload.customers)
    if (Array.isArray(payload.products)) await db.products.bulkPut(payload.products)
    if (Array.isArray(payload.estimates)) {
      await db.estimates.bulkPut(
        payload.estimates.map((e) => ({
          ...e,
          customerId: e.customer?.id || e.customerId || '',
          docType: e.docType || 'estimate',
          paymentStatus: e.paymentStatus || 'paid',
        })),
      )
    }

    await db.meta.put({ key: 'estimateCounter', value: Number(payload.estimateCounter) || 200 })
    await db.meta.put({ key: 'invoiceCounter', value: Number(payload.invoiceCounter) || 100 })
    await db.meta.put({ key: 'prefs', value: { ...defaultPrefs, ...(payload.prefs || {}) } })
    await db.meta.put({ key: 'boot', at: new Date().toISOString(), version: 2 })
  })

  return hydrateSnapshot()
}

export async function dbResetSeed() {
  await db.transaction('rw', db.shop, db.shops, db.customers, db.products, db.estimates, db.meta, async () => {
    await Promise.all([db.shop.clear(), db.shops.clear(), db.customers.clear(), db.products.clear(), db.estimates.clear()])
    await db.shop.put({ ...defaultShop })
    await db.shops.put({ ...defaultShop })
    await db.customers.bulkPut(seedCustomers)
    await db.products.bulkPut(seedProducts)
    await db.meta.put({ key: 'estimateCounter', value: 200 })
    await db.meta.put({ key: 'invoiceCounter', value: 100 })
    await db.meta.put({ key: 'prefs', value: { ...defaultPrefs } })
    await db.meta.put({ key: 'boot', at: new Date().toISOString(), version: 2 })
  })
  return hydrateSnapshot()
}
