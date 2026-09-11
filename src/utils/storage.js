/** Safe web storage — some phone browsers throw in private mode. */
export function storageGet(kind, key, fallback = null) {
  try {
    const store = kind === 'session' ? sessionStorage : localStorage
    const value = store.getItem(key)
    return value == null ? fallback : value
  } catch {
    return fallback
  }
}

export function storageSet(kind, key, value) {
  try {
    const store = kind === 'session' ? sessionStorage : localStorage
    store.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function storageRemove(kind, key) {
  try {
    const store = kind === 'session' ? sessionStorage : localStorage
    store.removeItem(key)
    return true
  } catch {
    return false
  }
}
