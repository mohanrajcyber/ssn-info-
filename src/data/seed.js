export const defaultPrefs = {
  theme: 'light', // light | dark
  language: 'en', // en | ta
  printSize: 'a4', // a4 | thermal
  pin: '',
  lastBackupAt: '',
  activeShopId: 'shop',
}

export const defaultShop = {
  id: 'shop',
  name: 'SSN INFO AND ENTERPRISES',
  address: 'NO.137, MAIN ROAD, THIRUVANTHIPURAM, Nellikuppam, Cuddalore, Tamil Nadu, 607401',
  phone: '9047221234',
  email: 'ssninfoandenterprises@gmail.com',
  gstin: '33AHHPT4973H1ZY',
  state: '33-Tamil Nadu',
  estimatePrefix: 'EST',
  invoicePrefix: 'INV',
  financialYear: '2627',
  logoDataUrl: '',
  lowStockAt: 10,
}

function withStock(p, stock = 500) {
  return { ...p, stockQty: stock, trackStock: true }
}

export const seedProducts = [
  withStock({ id: 'p1', name: '50 CHICKEN MASALA (AU)', hsn: '09109100', mrp: 300, unit: 'Kg', price: 286.62, gstPercent: 5 }, 200),
  withStock({ id: 'p2', name: 'CHICKEN MASALA 18GMS*10 (RS.10)', hsn: '09109100', mrp: 100, unit: 'SARAM', price: 72.38, gstPercent: 5 }),
  withStock({ id: 'p3', name: 'CHICKEN MASALA 10GMS*10 (RS.5)', hsn: '09109100', mrp: 50, unit: 'SARAM', price: 38.1, gstPercent: 5 }),
  withStock({ id: 'p4', name: 'SAMBAR POWDER 500 GMS (JN)', hsn: '09109100', mrp: '', unit: 'SARAM', price: 123.81, gstPercent: 5 }),
  withStock({ id: 'p5', name: 'CHILLI POWDER 500 GMS (JN)', hsn: '09042211', mrp: '', unit: 'SARAM', price: 133.33, gstPercent: 5 }),
  withStock({ id: 'p6', name: 'TURMERIC POWDER 500 GMS (JN)', hsn: '09103030', mrp: '', unit: 'SARAM', price: 142.86, gstPercent: 5 }),
  withStock({ id: 'p7', name: 'RASAM POWDER 50 GMS*10 (RS.10)', hsn: '09109100', mrp: 100, unit: 'SARAM', price: 76.19, gstPercent: 5 }),
  withStock({ id: 'p8', name: 'SAMBAR POWDER 50 GMS*10 (RS.10)', hsn: '09109100', mrp: 100, unit: 'SARAM', price: 76.19, gstPercent: 5 }),
  withStock({ id: 'p9', name: 'GARAM MASALA 10 GMS*10 (RS.5)', hsn: '09109100', mrp: 50, unit: 'SARAM', price: 38.1, gstPercent: 5 }),
  withStock({ id: 'p10', name: 'CHILLI POWDER 50GMS*10 (RS.10)', hsn: '09042211', mrp: 100, unit: 'SARAM', price: 76.19, gstPercent: 5 }),
  withStock({ id: 'p11', name: 'TURMERIC POWDER 50GMS*10 (RS.10)', hsn: '09103030', mrp: 100, unit: 'SARAM', price: 76.19, gstPercent: 5 }),
  withStock({ id: 'p12', name: 'MUTTON MASALA 10GMS*10 (RS.5)', hsn: '09109100', mrp: 50, unit: 'SARAM', price: 38.1, gstPercent: 5 }),
  withStock({ id: 'p13', name: 'CORIANDER POWDER 50GMS*10 (RS.10)', hsn: '09092200', mrp: 100, unit: 'SARAM', price: 76.19, gstPercent: 5 }),
]

export const seedCustomers = [
  {
    id: 'c1',
    name: 'SSN INFO AND ENTERPRISES',
    address: '9A/1 Panruti Main Road, Abatharanapuram Vadalur, Cuddalore, Tamil Nadu-607303, India',
    phone: '9443438768',
    gstin: '33AAKFE1938R1ZX',
    state: '33-Tamil Nadu',
  },
]

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function todayGB() {
  return new Date().toLocaleDateString('en-GB').split('/').join('-')
}
