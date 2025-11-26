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
        const fromTable = `${form.dpccode}_STOCK` // e.g. RCD_STOCK
        //const modifiedBy = getModifiedBy()
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
        if (!form.items || form.items.length === 0) {
          throw new Error('Cannot submit sale with no items')
        }

        for (const item of form.items) {
          const { productcode, quantity } = item

          // 🔹 Fetch current stock
          const { data: stock, error: stockError } = await supabase
            .from(fromTable)
            .select('quantity')
            .eq('productcode', productcode)
            .single()

          if (stockError)
            throw new Error(`Stock fetch failed for ${productcode}: ${stockError.message}`)
          if (!stock || stock.quantity < quantity)
            throw new Error(`Insufficient stock for product ${productcode}`)

          // 🔹 Deduct the quantity
          const newQty = stock.quantity - quantity

          const { error: updateError } = await supabase
            .from(fromTable)
            .update({
              quantity: newQty,
              lastmodified: now,
              modifiedby: form.lastModifiedby,
            })
            .eq('productcode', productcode)

          if (updateError)
            throw new Error(`Failed to update stock for ${productcode}: ${updateError.message}`)
        }

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
