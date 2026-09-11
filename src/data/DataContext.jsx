import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  bootDatabase,
  dbApplyStock,
  dbDeleteCustomer,
  dbDeleteEstimate,
  dbDeleteProduct,
  dbDeleteShopProfile,
  dbExportAll,
  dbImportAll,
  dbNextDocNo,
  dbResetSeed,
  dbSavePrefs,
  dbSaveShop,
  dbUpsertCustomer,
  dbUpsertEstimate,
  dbUpsertProduct,
  dbUpsertShopProfile,
} from './db'
import { defaultPrefs, uid } from './seed'
import { storageGet, storageRemove, storageSet } from '../utils/storage'

const DataContext = createContext(null)

const emptySnap = {
  shop: null,
  shops: [],
  customers: [],
  products: [],
  estimates: [],
  estimateCounter: 200,
  invoiceCounter: 100,
  prefs: { ...defaultPrefs },
}

export function DataProvider({ children }) {
  const [status, setStatus] = useState('booting')
  const [error, setError] = useState('')
  const [snap, setSnap] = useState(emptySnap)
  const [busy, setBusy] = useState(false)
  const [unlocked, setUnlocked] = useState(() => storageGet('session', 'srt_unlocked') === '1')

  useEffect(() => {
    let alive = true
    const timeout = window.setTimeout(() => {
      if (!alive) return
      setStatus((s) => {
        if (s === 'booting') {
          setError('Phone database is slow or blocked. Chrome-la open pannunga, or Retry.')
          return 'error'
        }
        return s
      })
    }, 12000)

    ;(async () => {
      try {
        const data = await bootDatabase()
        if (!alive) return
        window.clearTimeout(timeout)
        setSnap(data)
        setStatus('ready')
        applyTheme(data.prefs?.theme)
        if (!data.prefs?.pin) {
          setUnlocked(true)
          storageSet('session', 'srt_unlocked', '1')
        }
      } catch (err) {
        console.error(err)
        if (!alive) return
        window.clearTimeout(timeout)
        setError(err?.message || 'Database failed to open on this phone browser')
        setStatus('error')
      }
    })()
    return () => {
      alive = false
      window.clearTimeout(timeout)
    }
  }, [])

  const replaceSnap = useCallback((data) => {
    setSnap(data)
    applyTheme(data.prefs?.theme)
  }, [])

  const savePrefs = useCallback(async (patch) => {
    const next = { ...snap.prefs, ...patch }
    setSnap((s) => ({ ...s, prefs: next }))
    await dbSavePrefs(next)
    if (patch.theme) applyTheme(patch.theme)
    return next
  }, [snap.prefs])

  const saveShop = useCallback(async (shop) => {
    setBusy(true)
    try {
      const row = await dbUpsertShopProfile({ ...shop, id: shop.id || snap.shop?.id || 'shop' })
      if (row.id === 'shop') await dbSaveShop(row)
      setSnap((s) => {
        const shops = s.shops.some((x) => x.id === row.id)
          ? s.shops.map((x) => (x.id === row.id ? row : x))
          : [...s.shops, row]
        const activeId = s.prefs.activeShopId || 'shop'
        return {
          ...s,
          shops,
          shop: activeId === row.id || (!s.prefs.activeShopId && row.id === 'shop') ? row : s.shop,
        }
      })
    } finally {
      setBusy(false)
    }
  }, [snap.shop])

  const switchShop = useCallback(async (shopId) => {
    const profile = snap.shops.find((s) => s.id === shopId)
    if (!profile) return
    const prefs = await savePrefs({ activeShopId: shopId })
    setSnap((s) => ({ ...s, shop: profile, prefs }))
    if (shopId === 'shop') await dbSaveShop(profile)
  }, [snap.shops, savePrefs])

  const addShopProfile = useCallback(async (partial) => {
    const row = await dbUpsertShopProfile({
      ...snap.shop,
      ...partial,
      id: uid('shop'),
      name: partial.name || 'New Shop / Godown',
    })
    setSnap((s) => ({ ...s, shops: [...s.shops, row] }))
    return row
  }, [snap.shop])

  const removeShopProfile = useCallback(async (id) => {
    await dbDeleteShopProfile(id)
    setSnap((s) => {
      const shops = s.shops.filter((x) => x.id !== id)
      const prefs = { ...s.prefs, activeShopId: s.prefs.activeShopId === id ? 'shop' : s.prefs.activeShopId }
      const shop = shops.find((x) => x.id === prefs.activeShopId) || shops[0]
      return { ...s, shops, shop, prefs }
    })
    await dbSavePrefs({ ...snap.prefs, activeShopId: id === snap.prefs.activeShopId ? 'shop' : snap.prefs.activeShopId })
  }, [snap.prefs])

  const upsertCustomer = useCallback(async (customer) => {
    const row = { ...customer, id: customer.id || uid('c') }
    setSnap((s) => {
      const exists = s.customers.some((c) => c.id === row.id)
      const customers = exists ? s.customers.map((c) => (c.id === row.id ? row : c)) : [row, ...s.customers]
      customers.sort((a, b) => a.name.localeCompare(b.name))
      return { ...s, customers }
    })
    await dbUpsertCustomer(row)
    return row
  }, [])

  const deleteCustomer = useCallback(async (id) => {
    setSnap((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }))
    await dbDeleteCustomer(id)
  }, [])

  const upsertProduct = useCallback(async (product) => {
    const row = {
      trackStock: true,
      stockQty: 0,
      ...product,
      id: product.id || uid('p'),
    }
    setSnap((s) => {
      const exists = s.products.some((p) => p.id === row.id)
      const products = exists ? s.products.map((p) => (p.id === row.id ? row : p)) : [row, ...s.products]
      products.sort((a, b) => a.name.localeCompare(b.name))
      return { ...s, products }
    })
    await dbUpsertProduct(row)
    return row
  }, [])

  const deleteProduct = useCallback(async (id) => {
    setSnap((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }))
    await dbDeleteProduct(id)
  }, [])

  const upsertEstimate = useCallback(
    async (estimate, { allocateNo = false } = {}) => {
      const docType = estimate.docType || 'estimate'
      let payload = {
        paymentStatus: 'paid',
        paidPaise: 0,
        stockApplied: false,
        shopId: snap.prefs.activeShopId || 'shop',
        ...estimate,
        id: estimate.id || uid('est'),
        docType,
        updatedAt: new Date().toISOString(),
        customerId: estimate.customer?.id || '',
      }

      let estCounter = null
      let invCounter = null

      const needNo = allocateNo || !payload.estimateNo
      if (needNo) {
        const { docNo, counter, key } = await dbNextDocNo(snap.shop, docType)
        payload = { ...payload, estimateNo: docNo }
        if (key === 'invoiceCounter') invCounter = counter
        else estCounter = counter
      }

      // Stock: deduct when saving as invoice first time
      if (docType === 'invoice' && !payload.stockApplied) {
        const updated = await dbApplyStock(payload.lines || [])
        if (updated.length) {
          setSnap((s) => ({
            ...s,
            products: s.products.map((p) => updated.find((u) => u.id === p.id) || p),
          }))
        }
        payload = { ...payload, stockApplied: true }
      }

      setSnap((s) => {
        const exists = s.estimates.some((e) => e.id === payload.id)
        const estimates = exists
          ? s.estimates.map((e) => (e.id === payload.id ? payload : e))
          : [payload, ...s.estimates]
        estimates.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        return {
          ...s,
          estimates,
          estimateCounter: estCounter ?? s.estimateCounter,
          invoiceCounter: invCounter ?? s.invoiceCounter,
        }
      })

      await dbUpsertEstimate(payload)
      return payload
    },
    [snap.shop, snap.prefs.activeShopId],
  )

  const deleteEstimate = useCallback(async (id) => {
    setSnap((s) => ({ ...s, estimates: s.estimates.filter((e) => e.id !== id) }))
    await dbDeleteEstimate(id)
  }, [])

  const exportBackup = useCallback(async () => {
    const data = await dbExportAll()
    setSnap((s) => ({ ...s, prefs: data.prefs }))
    return data
  }, [])

  const importBackup = useCallback(async (payload) => {
    setBusy(true)
    try {
      replaceSnap(await dbImportAll(payload))
    } finally {
      setBusy(false)
    }
  }, [replaceSnap])

  const resetSeed = useCallback(async () => {
    setBusy(true)
    try {
      replaceSnap(await dbResetSeed())
    } finally {
      setBusy(false)
    }
  }, [replaceSnap])

  const getEstimate = useCallback(
    (id) => snap.estimates.find((e) => e.id === id) || null,
    [snap.estimates],
  )

  const tryUnlock = useCallback(
    (pin) => {
      if (!snap.prefs?.pin || String(pin) === String(snap.prefs.pin)) {
        setUnlocked(true)
        storageSet('session', 'srt_unlocked', '1')
        return true
      }
      return false
    },
    [snap.prefs],
  )

  const lockNow = useCallback(() => {
    setUnlocked(false)
    storageRemove('session', 'srt_unlocked')
  }, [])

  const value = useMemo(
    () => ({
      status,
      error,
      busy,
      unlocked,
      shop: snap.shop,
      shops: snap.shops,
      customers: snap.customers,
      products: snap.products,
      estimates: snap.estimates,
      estimateCounter: snap.estimateCounter,
      invoiceCounter: snap.invoiceCounter,
      prefs: snap.prefs,
      saveShop,
      savePrefs,
      switchShop,
      addShopProfile,
      removeShopProfile,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      upsertEstimate,
      deleteEstimate,
      getEstimate,
      exportBackup,
      importBackup,
      resetSeed,
      tryUnlock,
      lockNow,
    }),
    [
      status,
      error,
      busy,
      unlocked,
      snap,
      saveShop,
      savePrefs,
      switchShop,
      addShopProfile,
      removeShopProfile,
      upsertCustomer,
      deleteCustomer,
      upsertProduct,
      deleteProduct,
      upsertEstimate,
      deleteEstimate,
      getEstimate,
      exportBackup,
      importBackup,
      resetSeed,
      tryUnlock,
      lockNow,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
