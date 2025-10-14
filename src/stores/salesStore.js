// stores/salesStore.js
import { defineStore } from 'pinia'
import { supabase } from '../boot/supabase'

// 🔹 Helper function to format local date-time
function getLocalDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  // 👇 no timezone, this is your actual wall-clock time
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export const useSalesStore = defineStore('salesStore', {
  state: () => ({
    products: [],
    salesItems: [],
    headerData: {
      receiptno: '',
      salesdate: '',
      distributoridno: '',
      dpccode: '',
      exchangeRate: '',
    },
  }),

  actions: {
    async fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active') // Filter by status
        .order('productname', { ascending: true })

      if (error) throw error
      this.products = data
    },

    async fetchExchangeRate() {
      const { data, error } = await supabase.from('ExchangeRate').select('"Rate"').limit(1)

      if (error) throw error
      if (data && data.length > 0) {
        this.headerData.exchangeRate = data[0].Rate
      } else {
        this.headerData.exchangeRate = 'Not Set'
        console.warn('No exchange rate found in database.')
      }
    },

    getProductByCode(code) {
      return this.products.find((p) => p.productcode === code)
    },

    addItemToList(selectedProduct, quantity) {
      const existing = this.salesItems.find(
        (item) => item.productcode === selectedProduct.productcode,
      )
      if (existing) {
        existing.quantity += quantity
        existing.totalprice = existing.quantity * existing.distributorprice
        existing.totalbv = existing.quantity * existing.bvs
      } else {
        this.salesItems.push({
          ...selectedProduct,
          quantity,
          totalprice: selectedProduct.distributorprice * quantity,
          totalbv: selectedProduct.bvs * quantity,
        })
      }
    },

    removeItem(index) {
      this.salesItems.splice(index, 1)
    },

    async submitSale(form) {
      try {
        // form.salesdate = getLocalDateTime()
        const now = getLocalDateTime()

        // 1. Insert into salesheader
        const { error: headerError } = await supabase.from('salesheader').insert([
          {
            receiptno: form.receiptno,
            distributoridno: form.distributoridno.toUpperCase(),
            salesdate: form.salesdate,
            datecreated: now,
            createdby: form.createdby,
            lastmodified: now,
            lastmodifiedby: form.lastModifiedby,
            dpccode: form.dpccode,
            entrysource: form.entrysource,
            entered_by: form.entered_by, // use current user's UUID from auth
          },
        ])

        if (headerError) throw headerError

        // 2. Insert each item into salesdetails
        const detailsData = form.items.map((item) => ({
          receiptno: form.receiptno,
          productcode: item.productcode,
          unitprice: item.unitprice,
          unitbv: item.unitbv,
          quantity: item.quantity,
        }))

        const { error: detailsError } = await supabase.from('salesdetails').insert(detailsData)

        if (detailsError) throw detailsError

        console.log('Sale submitted successfully.')
        return { success: true }
      } catch (error) {
        console.error('Failed to submit sale:', error.message)
        return { success: false, error }
      }
    },
  },
})
