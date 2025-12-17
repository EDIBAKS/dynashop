<template>
  <q-page class="q-pa-md">
    <!-- Filters -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="startDate" type="date" label="Start Date" outlined dense />
        </div>

        <div class="col-12 col-md-4">
          <q-input v-model="endDate" type="date" label="End Date" outlined dense />
        </div>

        <div class="col-12 col-md-4">
          <q-btn
            label="Fetch Data"
            color="primary"
            class="full-width"
            :loading="loading"
            @click="fetchSalesReport"
          />
        </div>
      </div>
    </q-card>

    <!-- Results Table -->
    <q-card flat bordered>
      <q-table
        title="Sales Pivot by Shop"
        :rows="rows"
        :columns="columns"
        row-key="productcode"
        dense
        flat
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from 'src/boot/supabase'
import { date } from 'quasar'

const rows = ref([])
const loading = ref(false)
const columns = ref([])

// Default dates (today)
const today = date.formatDate(new Date(), 'YYYY-MM-DD')
const startDate = ref(today)
const endDate = ref(today)

async function fetchSalesReport() {
  loading.value = true
  rows.value = []
  columns.value = []

  const { data, error } = await supabase.rpc('get_shop_sales_normalized', {
    p_start_date: startDate.value,
    p_end_date: endDate.value,
  })

  loading.value = false

  if (error) {
    console.error(error)
    return
  }

  const pivoted = pivotSalesData(data)

  // Base columns
  columns.value = [
    { name: 'productcode', label: 'Code', field: 'productcode', sortable: true },
    { name: 'productname', label: 'Product', field: 'productname', sortable: true },
    { name: 'distributorprice', label: 'Price', field: 'distributorprice', align: 'right' },
  ]

  // Dynamic shop columns
  pivoted.shops.forEach((shop) => {
    columns.value.push({
      name: shop,
      label: shop,
      field: shop,
      align: 'right',
    })
  })

  rows.value = pivoted.rows
}

function pivotSalesData(data) {
  const productsMap = {}
  const shopSet = new Set()

  data.forEach((row) => {
    shopSet.add(row.shopcode)

    if (!productsMap[row.productcode]) {
      productsMap[row.productcode] = {
        productcode: row.productcode,
        productname: row.productname,
        distributorprice: row.distributorprice,
      }
    }

    productsMap[row.productcode][row.shopcode] = row.total_quantity
  })

  // Ensure missing shop columns are filled with 0
  Object.values(productsMap).forEach((product) => {
    shopSet.forEach((shop) => {
      if (product[shop] == null) {
        product[shop] = 0
      }
    })
  })

  return {
    rows: Object.values(productsMap),
    shops: Array.from(shopSet),
  }
}

//function formatCurrency(value) {
//if (value == null) return '-'
//return new Intl.NumberFormat().format(value)
//}
</script>
