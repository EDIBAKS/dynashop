<template>
  <q-page class="q-pa-md">
    <q-card flat class="q-pa-md" style="max-width: 1200px; margin: 0 auto">
      <!-- FILTER CONTROLS -->
      <div class="row items-center justify-center">
        <q-option-group v-model="dispatchType" :options="dispatchTypes" inline type="radio" />
      </div>

      <div class="row no-wrap items-stretch q-col-gutter-sm full-width">
        <div class="col">
          <!-- ADMIN or SUPERADMIN -->
          <q-select
            v-if="isAdminOrSuperAdmin"
            v-model="fromValue"
            :options="fromOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            label="From"
            dense
            outlined
            class="full-width"
            @update:model-value="loadToOptions"
          />

          <!-- NORMAL USER -->
          <q-input
            v-else
            v-model="fromValue"
            label="Your DPC"
            outlined
            dense
            readonly
            input-class="text-blue text-bold text-center"
          />
        </div>

        <div class="col" v-if="isAdminOrSuperAdmin">
          <!-- TO SELECT ONLY FOR ADMIN/SUPERADMIN -->
          <q-select
            v-model="toValue"
            :options="toOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            label="To"
            dense
            outlined
            class="full-width"
          />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mt-md">
        <div class="col">
          <q-input
            v-model="startDate"
            type="date"
            label="Start Date"
            dense
            outlined
            class="full-width"
          />
        </div>

        <div class="col">
          <q-input
            v-model="endDate"
            type="date"
            label="End Date"
            dense
            outlined
            class="full-width"
          />
        </div>
      </div>

      <div class="row justify-end q-mt-sm q-gutter-sm">
        <q-btn color="primary" label="Fetch Dispatches" @click="fetchDispatches" />
        <q-btn
          dense
          flat
          icon="table_view"
          color="green"
          @click="exportToExcel"
          title="Export to Excel"
        />
        <q-btn
          dense
          flat
          icon="picture_as_pdf"
          color="red"
          @click="exportToPDF"
          title="Export to PDF"
        />
      </div>

      <!-- FETCH BUTTON -->

      <!-- DISPATCH HEADER -->
      <div v-if="groupedDispatches.length" class="text-center q-mt-lg q-mb-sm">
        <div class="text-h6 text-bold text-primary">
          Dispatch: {{ groupedDispatches[0].fromName }} → {{ groupedDispatches[0].toName }}
        </div>

        <!-- From/To Dates -->
        <div class="text-subtitle2 text-grey-7 q-mt-xs">
          From: <span class="text-bold">{{ startDate }}</span> &nbsp; | &nbsp; To:
          <span class="text-bold">{{ endDate }}</span>
        </div>
      </div>

      <!-- TABLE -->
      <q-table
        v-if="groupedDispatches.length"
        :rows="groupedDispatches"
        :columns="columns"
        row-key="productcode"
        flat
        dense
        class="q-mt-md"
      />
      <div v-else class="text-center q-mt-md text-grey">No dispatch records found.</div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from 'boot/supabase'
import { useAuth } from 'stores/auth'
import { useQuasar } from 'quasar'
const auth = useAuth()
const $q = useQuasar()
import * as XLSX from 'xlsx'
//import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable' // ✅ default import

//const auth = useAuth()
// STATE
const dispatchType = ref('P2S') // P2P: Province → Province, P2S: Province → Shop
const fromOptions = ref([])
const toOptions = ref([])
const fromValue = ref(null)
const toValue = ref(null)
const startDate = ref(null)
const endDate = ref(null)
const productsMap = ref({}) // { productcode: { productname, distributorprice } }
const dispatchTypes = computed(() => {
  return isAdminOrSuperAdmin.value
    ? [
        { label: 'Province → Shop', value: 'P2S' },
        { label: 'Province → Province', value: 'P2P' },
      ]
    : [
        { label: 'Shop Dispatches', value: 'SHOP' }, // just for display
      ]
})

// --- ROLE COMPUTATIONS ---
const isAdmin = computed(() => auth.userDetails?.role === 'Admin')
const isSuperAdmin = computed(() => auth.userDetails?.role === 'SuperAdmin')
const isAdminOrSuperAdmin = computed(() => isAdmin.value || isSuperAdmin.value)

// --- DATA ---
const dispatches = ref([])
const columns = [
  {
    name: 'date',
    label: 'Dispatch Date',
    field: 'date',
    align: 'left',
    format: (val) => (val ? val.split('T')[0] : ''), // show only date
  },
  {
    name: 'productcode',
    label: 'Product Code',
    field: 'productcode',
    align: 'left',
  },
  {
    name: 'productname',
    label: 'Product Name',
    field: 'productname',
    align: 'left',
  },
  {
    name: 'distributorprice',
    label: 'DP',
    field: 'distributorprice',
    align: 'right',
    format: (v) => Number(v).toLocaleString(),
  },
  {
    name: 'quantity',
    label: 'Qty',
    field: 'quantity',
    align: 'right',
  },
  {
    name: 'totalValue',
    label: 'Value',
    field: (row) => row.distributorprice * row.quantity, // compute Value = DP * Qty
    align: 'right',
    format: (v) => Number(v).toLocaleString(),
  },
  {
    name: 'dispatchedby',
    label: 'Dispatched By',
    field: 'dispatchedby',
    align: 'left',
  },
]

async function fetchProvinces() {
  if (!auth.userDetails?.country_code) return

  const { data, error } = await supabase
    .from('province')
    .select('name, province_code')
    .eq('country_code', auth.userDetails.country_code)

  if (!error) {
    fromOptions.value = data.map((p) => ({
      label: p.name,
      value: p.province_code,
    }))
  }
}
async function fetchShops(province_code) {
  console.log('🔵 fetchShops() province_code =', province_code)
  console.log('🔵 type =', typeof province_code)

  const { data, error } = await supabase
    .from('shops')
    .select('shop_name, shopcode, province_code')
    .eq('province_code', province_code)

  if (error) {
    console.error('❌ Error fetching shops:', error.message)
    return
  }

  console.log('🟩 Shops returned from Supabase =', data)

  toOptions.value = data.map((shop) => ({
    label: shop.shop_name,
    value: shop.shopcode,
  }))
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('productcode, productname, distributorprice')

  if (error) {
    console.error('❌ Error fetching products:', error.message)
    return
  }

  productsMap.value = data.reduce((acc, p) => {
    acc[p.productcode] = { productname: p.productname, distributorprice: p.distributorprice }
    return acc
  }, {})
}

watch(
  () => fromValue.value,
  (newVal) => {
    console.log('🟠 WATCH: fromValue changed →', newVal)
    console.log('🟠 type =', typeof newVal)
  },
)

async function loadToOptions() {
  console.log('🟡 loadToOptions → fromValue =', fromValue.value)

  if (!fromValue.value) return

  if (dispatchType.value === 'P2P') {
    toOptions.value = fromOptions.value.filter((p) => p.value !== fromValue.value)
  }

  if (dispatchType.value === 'P2S') {
    console.log('🟣 Calling fetchShops with:', fromValue.value)
    await fetchShops(fromValue.value)
  }
}

// --- ON MOUNT ---
onMounted(async () => {
  await fetchProvinces()

  await fetchProducts()
  if (!isAdminOrSuperAdmin.value) {
    fromValue.value = auth.userDetails?.dpc_id
    // TO becomes shops inside user's province
    await fetchShops(auth.userDetails?.province_code)
  }
})

async function fetchDispatches() {
  try {
    console.log('🚀 START fetchDispatches()')

    if (!startDate.value || !endDate.value) {
      $q.notify({ type: 'negative', message: 'Please select both start and end dates.' })
      return
    }

    let query = supabase
      .from('dispatches')
      .select('*')
      .gte('datecreated', startDate.value + ' 00:00:00')
      .lte('datecreated', endDate.value + ' 23:59:59')

    if (isAdminOrSuperAdmin.value) {
      // ✅ Admins must select FROM and TO
      if (!fromValue.value || !toValue.value) {
        $q.notify({ type: 'negative', message: 'Please select both FROM and TO locations.' })
        return
      }
      query = query.eq('from_location', fromValue.value).eq('to_location', toValue.value)
    } else {
      // ✅ Normal users: only TO = their DPC
      query = query.eq('to_location', auth.userDetails?.dpc_id)
    }

    const { data, error } = await query

    console.log('📥 RAW SUPABASE RESPONSE:')
    console.log('   🔹 data =', data)
    console.log('   🔹 error =', error)

    if (error) throw error

    dispatches.value = data || []
    console.log('🟢 Table updated → dispatches =', dispatches.value)
  } catch (err) {
    console.error('🔥 fetchDispatches() failed:', err)
    $q.notify({ type: 'negative', message: err.message })
  }
}

const groupedDispatches = computed(() => {
  const groups = {}

  dispatches.value.forEach((d) => {
    const dateKey = d.datecreated.split('T')[0]

    const key = `${d.productcode}_${dateKey}`

    if (!groups[key]) {
      const fromName =
        fromOptions.value.find((p) => p.value === d.from_location)?.label || d.from_location

      const toName = toOptions.value.find((p) => p.value === d.to_location)?.label || d.to_location

      const product = productsMap.value[d.productcode] || {}

      groups[key] = {
        date: dateKey,
        productcode: d.productcode,
        productname: product.productname || d.productcode,

        // ⭐ ALWAYS convert to number to avoid NaN
        distributorprice: Number(product.distributorprice) || 0,

        quantity: 0,

        fromName,
        toName,

        dispatchedby: d.createdby,
      }
    }

    // ⭐ Convert quantity to number too
    groups[key].quantity += Number(d.quantity) || 0
  })

  return Object.values(groups).map((g) => ({
    ...g,
    totalValue: g.quantity * g.distributorprice,
  }))
})

function exportToExcel() {
  if (!groupedDispatches.value.length) return

  const ws = XLSX.utils.json_to_sheet(
    groupedDispatches.value.map((row) => ({
      'Dispatch Date': row.date,
      'Product Code': row.productcode,
      'Product Name': row.productname,
      Quantity: row.quantity,
      Value: row.distributorprice * row.quantity,
      'Dispatched By': row.dispatchedby,
    })),
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Report')

  const header = [
    [`From: ${groupedDispatches.value[0].fromName} → To: ${groupedDispatches.value[0].toName}`],
    [`Start Date: ${startDate.value} | End Date: ${endDate.value}`],
    [`Printed On: ${new Date().toLocaleString()}`],
    [], // empty row before table
  ]

  XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' })

  // Footer after data
  const footerRow = groupedDispatches.value.length + header.length + 2
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['Dispatched By:', '', '', 'Signature:'],
      ['Received By:', '', '', 'Signature:'],
    ],
    { origin: `A${footerRow}` },
  )

  XLSX.writeFile(wb, 'DispatchReport.xlsx')
}

function exportToPDF() {
  const doc = new jsPDF()
  const tableColumns = [
    'Dispatch Date',
    'Product Code',
    'Product Name',
    'DP',
    'Qty',
    'Value',
    'Dispatched By',
  ]

  const tableRows = groupedDispatches.value.map((row) => [
    row.date,
    row.productcode,
    row.productname,
    row.distributorprice,
    row.quantity,
    row.distributorprice * row.quantity,
    row.dispatchedby,
  ])

  // Header
  const startY = 20
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0) // black
  doc.text(
    `From: ${groupedDispatches.value[0].fromName} → To: ${groupedDispatches.value[0].toName}`,
    14,
    startY,
  )
  doc.text(`Start Date: ${startDate.value} | End Date: ${endDate.value}`, 14, startY + 6)
  doc.text(`Printed On: ${new Date().toLocaleString()}`, 14, startY + 12)

  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: startY + 20,
    theme: 'grid',
  })

  // Footer
  const finalY = doc.lastAutoTable.finalY + 10
  doc.text('Dispatched By: ______________________', 14, finalY)
  doc.text('Received By: ______________________', 14, finalY + 10)

  doc.save('DispatchReport.pdf')
}
</script>
