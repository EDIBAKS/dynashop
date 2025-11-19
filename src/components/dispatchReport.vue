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

      <!-- FETCH BUTTON -->
      <div class="row justify-end q-mt-sm">
        <q-btn color="primary" label="Fetch Dispatches" @click="fetchDispatches" />
      </div>

      <!-- TABLE -->
      <q-table
        v-if="dispatches.length"
        :rows="mappedDispatches"
        :columns="columns"
        row-key="id"
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

//const auth = useAuth()
// STATE
const dispatchType = ref('P2P') // P2P: Province → Province, P2S: Province → Shop
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
        { label: 'Province → Province', value: 'P2P' },
        { label: 'Province → Shop', value: 'P2S' },
      ]
    : [
        { label: 'Shop Dispatches', value: 'SHOP' }, // just for display
      ]
})

// --- ROLE COMPUTATIONS ---
const isAdmin = computed(() => auth.userDetails?.role === 'Admin')
const isSuperAdmin = computed(() => auth.userDetails?.role === 'SuperAdmin')
const isAdminOrSuperAdmin = computed(() => isAdmin.value || isSuperAdmin.value)

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-based
  const yyyy = date.getFullYear()

  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${dd}-${mm}-${yyyy}:${hh}-${min}`
}

// --- DATA ---
const dispatches = ref([])
const columns = [
  { name: 'fromName', label: 'From', field: 'fromName', align: 'left' },
  { name: 'toName', label: 'To', field: 'toName', align: 'left' },
  { name: 'productcode', label: 'Product Code', field: 'productcode', align: 'left' },
  { name: 'productname', label: 'Product Name', field: 'productname', align: 'left' },
  {
    name: 'distributorprice',
    label: 'Distributor Price',
    field: 'distributorprice',
    align: 'right',
  },
  { name: 'quantity', label: 'Quantity', field: 'quantity', align: 'right' },
  { name: 'totalValue', label: 'Total Value', field: 'totalValue', align: 'right' },
  { name: 'dispatchedon', label: 'Dispatched On', field: 'dispatchedon', align: 'left' },
  { name: 'dispatchedby', label: 'Dispatched By', field: 'dispatchedby', align: 'left' },
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

const mappedDispatches = computed(() => {
  return dispatches.value.map((d) => {
    // Get "From Name"
    let fromName =
      fromOptions.value.find((p) => p.value === d.from_location)?.label || d.from_location

    // Get "To Name"
    let toName = toOptions.value.find((p) => p.value === d.to_location)?.label || d.to_location

    // Get product info
    const product = productsMap.value[d.productcode] || {}
    const productname = product.productname || d.productcode
    const distributorprice = product.distributorprice || 0

    // Total value
    const totalValue = distributorprice * d.quantity

    return {
      ...d,
      fromName,
      toName,
      productname,
      distributorprice,
      totalValue,

      dispatchedon: formatDate(d.datecreated),
      dispatchedby: d.createdby,
    }
  })
})

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
</script>
