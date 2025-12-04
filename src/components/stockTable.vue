<template>
  <div class="q-pa-md">
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">Stock Table View</div>

          <!-- SEARCH BAR -->
          <q-input
            dense
            debounce="300"
            outlined
            v-model="searchText"
            placeholder="Search product name..."
            class="q-ml-md"
            style="max-width: 250px"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>

          <!-- EXPORT BUTTON -->
          <q-btn
            color="primary"
            icon="picture_as_pdf"
            label="Export"
            @click="openExportChoiceDialog"
            dense
            flat
          />
        </div>
      </q-card-section>

      <!-- COLUMN SELECTION -->
      <q-card-section>
        <q-option-group
          v-model="visibleColumns"
          :options="allColumnsOptions"
          type="checkbox"
          inline
        />

        <div class="row q-gutter-sm q-mt-sm">
          <q-btn dense label="Select All" @click="selectAllColumns" />
          <q-btn dense color="negative" label="Clear All" @click="clearAllColumns" />
        </div>
      </q-card-section>

      <!-- STOCK TABLE -->
      <q-card-section>
        <q-table
          flat
          dense
          :rows="filteredRows"
          :columns="filteredColumns"
          row-key="productcode"
          :loading="loading"
        />
      </q-card-section>

      <!-- EXPORT DIALOG -->
      <q-dialog v-model="showExportChoice">
        <q-card>
          <q-card-section class="text-h6">Export Options</q-card-section>

          <q-card-section>
            <q-btn outline color="primary" label="Export Summary PDF" @click="exportSummary" />
            <q-btn
              outline
              color="secondary"
              class="q-ml-md"
              label="Export Detailed PDF"
              @click="exportDetailed"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn v-close-popup flat label="Close" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card>
  </div>
</template>

<script setup>
/* ----------------------------------------------
   IMPORTS
---------------------------------------------- */
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import jsPDF from 'jspdf'
import { supabase } from 'boot/supabase'
import { useAuth } from 'stores/auth'

/* ----------------------------------------------
   STATE
---------------------------------------------- */
const $q = useQuasar()
const auth = useAuth()

const loading = ref(false)

const rows = ref([])
const columns = ref([])
const allColumns = ref([])
const visibleColumns = ref([])

const searchText = ref('')
const showExportChoice = ref(false)

/* ----------------------------------------------
   FILTERED ROWS
---------------------------------------------- */
const rowsWithTotal = computed(() =>
  rows.value.map((row) => {
    let total = 0

    Object.keys(row).forEach((key) => {
      if (key !== 'productcode' && key !== 'productname') {
        const val = Number(row[key])
        if (!isNaN(val)) total += val
      }
    })

    return { ...row, TotalProduct: total }
  }),
)

const filteredRows = computed(() => {
  if (!searchText.value.trim()) return rowsWithTotal.value

  return rowsWithTotal.value.filter((r) =>
    r.productname.toLowerCase().includes(searchText.value.toLowerCase()),
  )
})

const filteredColumns = computed(() =>
  columns.value.filter((c) => visibleColumns.value.includes(c.name)),
)

const allColumnsOptions = computed(() =>
  allColumns.value.map((c) => ({
    label: c.label,
    value: c.name,
  })),
)

/* ----------------------------------------------
   WATCHERS
---------------------------------------------- */
watch(visibleColumns, (val) => localStorage.setItem('visibleStockCols', JSON.stringify(val)), {
  deep: true,
})

/* ----------------------------------------------
   LIFECYCLE
---------------------------------------------- */
onMounted(() => {
  const saved = localStorage.getItem('visibleStockCols')
  if (saved) visibleColumns.value = JSON.parse(saved)

  buildStockPivot()
})

/* ----------------------------------------------
   COLUMN CONTROL
---------------------------------------------- */
function selectAllColumns() {
  visibleColumns.value = allColumns.value.map((c) => c.name)
}

function clearAllColumns() {
  visibleColumns.value = []
}

/* ----------------------------------------------
   FETCH STOCK PER TABLE
---------------------------------------------- */
async function fetchStockForTable(tableName, productCodes = []) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('productcode, quantity')
      .in('productcode', productCodes)

    if (error) return new Map()

    const map = new Map()
    for (const r of data || []) map.set(r.productcode, Number(r.quantity || 0))
    return map
  } catch {
    return new Map()
  }
}

/* ----------------------------------------------
   BUILD PIVOT DATA
---------------------------------------------- */
async function buildStockPivot() {
  try {
    loading.value = true
    const countryCode = auth.userDetails?.country_code
    if (!countryCode) throw new Error('User country_code missing')

    // Fetch Products
    const { data: productsData } = await supabase
      .from('products')
      .select('productcode, productname')
      .eq('status', 'active')
      .order('productname')

    const products = productsData || []
    const productCodes = products.map((p) => p.productcode)

    // Fetch Provinces
    const { data: provincesData } = await supabase
      .from('province')
      .select('province_code, name')
      .eq('country_code', countryCode)
      .order('name')

    const provinces = provincesData || []
    const provCodes = provinces.map((p) => p.province_code)

    // Fetch Shops
    let shops = []
    if (provCodes.length > 0) {
      const { data: shopsData } = await supabase
        .from('shops')
        .select('shopcode, shop_name, province_code')
        .in('province_code', provCodes)

      if (shopsData) shops = shopsData
    }

    // Build location list
    const provinceLocations = provinces.map((prov) => ({
      label: prov.name,
      tableName: prov.province_code,
      type: 'province',
    }))

    const shopLocations = shops.map((sh) => ({
      label: `${sh.shop_name} (${sh.province_code})`,
      tableName: `${sh.shopcode}_STOCK`,
      type: 'shop',
    }))

    const locations = [...provinceLocations, ...shopLocations]

    // Fetch stock from all tables
    const stockMaps = await Promise.all(
      locations.map((loc) => fetchStockForTable(loc.tableName, productCodes)),
    )

    locations.forEach((loc, i) => (loc.stockMap = stockMaps[i]))

    // Build columns
    const baseCols = [
      { name: 'productcode', label: 'Code', field: 'productcode', align: 'left' },
      { name: 'productname', label: 'Product Name', field: 'productname', align: 'left' },
      { name: 'TotalProduct', label: 'Total', field: 'TotalProduct', align: 'right' },
    ]

    const locCols = locations.map((loc, i) => ({
      name: `loc_${i}`,
      label: loc.label,
      field: (row) => row[loc.label] ?? 0,
      align: 'center',
      classes:
        loc.type === 'province'
          ? 'bg-light-green-14 text-dark text-bold'
          : 'bg-orange text-dark text-bold',
    }))

    columns.value = [...baseCols, ...locCols]
    allColumns.value = [...baseCols, ...locCols]

    if (visibleColumns.value.length === 0) visibleColumns.value = baseCols.map((c) => c.name)

    // Build rows
    rows.value = products.map((prod) => {
      const row = {
        productcode: prod.productcode,
        productname: prod.productname,
      }

      locations.forEach((loc) => {
        row[loc.label] = loc.stockMap.get(prod.productcode) ?? 0
      })

      return row
    })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loading.value = false
  }
}

/* ----------------------------------------------
   EXPORT PDF
---------------------------------------------- */
function openExportChoiceDialog() {
  showExportChoice.value = true
}

function exportSummary() {
  showExportChoice.value = false
  exportToPDF('summary')
}

function exportDetailed() {
  showExportChoice.value = false
  exportToPDF('detailed')
}

function exportToPDF(mode) {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = 20

  doc.setFontSize(16)
  doc.text('STOCK MANIFEST', 14, y)
  y += 8

  doc.setFontSize(10)
  doc.text(`Printed By: ${auth.userDetails?.firstname || ''}`, 14, y)
  y += 5
  doc.text(`Print Date: ${new Date().toLocaleString()}`, 14, y)
  y += 6
  doc.line(14, y, 195, y)
  y += 8

  filteredRows.value.forEach((row) => {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.text(`${row.productname} | Code: ${row.productcode}`, 14, y)
    y += 8

    const detailRows =
      mode === 'summary'
        ? [{ label: 'Total Stock', value: row.TotalProduct }]
        : buildDetailList(row)

    detailRows.forEach((item) => {
      doc.text(item.label, 20, y)
      doc.text(String(item.value), 180, y, { align: 'right' })
      y += 6
    })

    doc.line(14, y, 195, y)
    y += 6
  })

  doc.save(`STOCK_MANIFEST_${mode}.pdf`)
}

function buildDetailList(row) {
  const items = [{ label: 'Total Stock', value: row.TotalProduct }]

  filteredColumns.value.forEach((c) => {
    if (!['productcode', 'productname', 'TotalProduct'].includes(c.name)) {
      items.push({ label: c.label, value: row[c.label] ?? 0 })
    }
  })

  return items
}
</script>

<style scoped>
.text-bold {
  font-weight: bold;
}
</style>
