<template>
  <q-card flat bordered class="q-pa-md bg-transparent" style="max-width: 600px; margin: auto">
    <q-form @submit.prevent="submitDispatch" class="column q-gutter-md">
      <!-- Radio buttons: DPC, SHOPS, PROMO, EXPIRY, DEBTS -->
      <div>
        <b>LOGGED IN TO:</b> {{ isAdmin ? auth.userDetails.dpc_id : auth.userDetails?.dpc_id }}
      </div>
      <div class="row items-center justify-center">
        <q-option-group
          v-model="dispatchType"
          :options="filteredOptions"
          inline
          type="radio"
          class="dispatch-type-group"
        >
          <template #label="opt">
            <span
              :class="['dispatch-option-label', opt.value === dispatchType ? 'active' : 'inactive']"
            >
              {{ opt.label }}
            </span>
          </template>
        </q-option-group>
      </div>

      <div class="row no-wrap items-stretch q-col-gutter-sm full-width">
        <!-- FROM select -->

        <div class="col">
          <!-- IF ADMIN OR SUPERADMIN -->
          <q-select
            v-if="isAdmin || isSuperAdmin"
            v-model="fromValue"
            :options="fromOptions"
            :option-label="fromLabel"
            :option-value="fromValueKey"
            :label="fromLabelText"
            dense
            outlined
            class="full-width"
            @update:model-value="populateSelects(true)"
          />

          <!-- IF NORMAL USER -->
          <q-input
            v-else
            v-model="fromValue.dpc_id"
            label="DPC Code"
            outlined
            dense
            readonly
            input-class="text-blue text-bold text-center"
          />
        </div>
        <!-- TO select (only show for DPC or SHOPS or DEBTS) -->
        <div class="col" v-if="!['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType)">
          <q-select
            v-model="toValue"
            :options="toOptions"
            :option-label="toLabel"
            :option-value="toValueKey"
            :label="toLabelText"
            dense
            outlined
            class="full-width"
          />
        </div>
      </div>
      <div class="row items-center justify-center q-col-gutter-sm full-width">
        <!-- Dispatch Date -->
        <q-input
          v-model="dispatchDate"
          type="date"
          label="Dispatch Date"
          dense
          outlined
          class="full-width"
          @update:model-value="onDispatchDateChange"
        />

        <!-- Expiry Date -->
        <q-input
          v-model="expiryDate"
          type="date"
          label="Expiry Date"
          dense
          outlined
          class="full-width"
        />
      </div>
      <div v-if="dispatchType === 'PROMOS' || dispatchType === 'DEBTS'" class="q-pa-md">
        <q-input v-model="distributoridno" label="Distributor ID" dense outlined />
        <DistributorSearch v-model="distributoridno" v-model:name="distributorname" />
      </div>
      <!-- FOR SHOP selection -->
      <!--
       <q-input
        v-if="dispatchType === 'SHOP'"
        :model-value="fromValue?.dpc_id || auth.userDetails?.dpc_id"
        label="From (DPC)"
        readonly
        dense
        outlined
      />
      
       -->

      <!-- Product Select -->
      <div class="q-pa-md">
        <!-- Searchable Select -->
        <q-select
          v-model="selectedProduct"
          :options="filteredProducts"
          option-label="productname"
          option-value="productcode"
          label="Select Product"
          use-input
          input-debounce="300"
          dense
          outlined
          @filter="filterProducts"
        />
      </div>

      <!-- Available Stock -->
      <q-input
        v-model="availableStock"
        label="Available Stock"
        readonly
        dense
        outlined
        input-class="text-blue text-bold text-center"
      />

      <!-- Dispatch Quantity -->
      <q-input
        v-model.number="dispatchQty"
        type="number"
        min="1"
        :max="availableStock"
        label="Dispatch Quantity"
        dense
        outlined
      />

      <q-btn
        type="submit"
        label="Submit"
        color="primary"
        :loading="loading"
        :disable="
          loading /* ⛔ prevent double submit */ ||
          !fromValue ||
          (!['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType) && !toValue) ||
          !selectedProduct ||
          dispatchQty < 1 ||
          dispatchQty > availableStock
        "
        class="full-width"
      />
      <div v-if="loading" class="q-mt-md flex flex-center">
        <q-spinner-hourglass color="light-green" size="50px" />
      </div>
    </q-form>
    <!-- ===================== PRODUCT ADDITION FORM ===================== -->
    <q-separator spaced />
    <div v-if="isAdmin || isSuperAdmin" class="text-subtitle2 text-center q-my-md">
      <!-- Select Province -->
      <q-banner rounded dense class="bg-red-1 text-red-10 q-mb-sm">
        <template v-slot:avatar>
          <q-icon name="warning" color="red" />
        </template>

        <div class="text-bold">Used Only to Enter New Stock to MainStore</div>

        <div class="text-caption">Not for Daily Use</div>
      </q-banner>
      Add Product to Main Store / Province
    </div>

    <q-form v-if="isSuperAdmin" @submit.prevent="submitProductAddition" class="column q-gutter-md">
      <q-select
        v-model="newProduct.selectedProvince"
        :options="provinceOptions"
        option-label="name"
        option-value="province_code"
        label="Select Province"
        use-input
        input-debounce="300"
        dense
        outlined
      />

      <!-- Select Product -->
      <q-select
        v-model="newProduct.selectedProduct"
        :options="activeProducts"
        option-label="productname"
        option-value="productcode"
        label="Select Product"
        use-input
        input-debounce="300"
        dense
        outlined
        @filter="filterActiveProducts"
      />

      <!-- Available Stock Input -->
      <q-input
        v-model="provinceStock"
        label="Available Stock"
        readonly
        dense
        outlined
        input-class="text-blue text-bold text-center"
      />

      <!-- Quantity -->
      <q-input
        v-model.number="newProduct.quantity"
        type="number"
        min="1"
        label="Quantity (pcs)"
        dense
        outlined
      />

      <!-- Date Added -->
      <q-input v-model="newProduct.dateAdded" type="date" label="Date Added" dense outlined />

      <!-- Expiry Date -->
      <q-input v-model="newProduct.expiryDate" type="date" label="Expiry Date" dense outlined />

      <!-- Submit Button -->
      <q-btn
        type="submit"
        label="Add Product"
        color="secondary"
        :disable="!canAddProduct"
        class="full-width"
      />
    </q-form>
  </q-card>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { supabase } from 'src/boot/supabase'
import { useAuth } from 'stores/auth'
import DistributorSearch from './DistributorSearch.vue'
import { Dialog } from 'quasar'
import { useQuasar } from 'quasar'
const auth = useAuth()
const $q = useQuasar()
const fromOptions = ref([])
const toOptions = ref([])
const fromValue = ref(null)
const toValue = ref(null)
const localProvinces = ref([])
const localShops = ref([])
const dispatchDate = ref(localStorage.getItem('dispatchDate') || '')
//let previousDate = '' // last accepted date

const expiryDate = ref('')
const selectedProduct = ref(null)
const dispatchQty = ref(1)
const distributoridno = ref('')
const distributorname = ref('')
// User role checks
const isAdmin = computed(() => auth.userDetails?.role === 'Admin')
const isSuperAdmin = computed(() => auth.userDetails?.role === 'SuperAdmin')
const isUser = computed(() => !isAdmin.value && !isSuperAdmin.value)
// set default dispatch type based on role
const dispatchType = ref(isAdmin.value || isSuperAdmin.value ? 'SHOP' : 'PROMOS')
const availableStock = ref(0)
// Reactive reference for stock
const provinceStock = ref(0)
const loading = ref(false)
// ✅ Reactive form object

// For non-admin users
const userDPCCODE = computed(() => auth.userDetails?.dpc_id || 'N/A')

const newProduct = reactive({
  selectedProvince: null,
  selectedProduct: null,
  quantity: 1,
  dateAdded: '',
  expiryDate: '',
  modifiedBy: auth.userDetails?.firstname || '',
})
// ✅ Option lists
const provinceOptions = ref([])
const activeProducts = ref([])
const filteredProducts = ref([])

// ✅ Validation
const canAddProduct = computed(
  () => newProduct.selectedProvince && newProduct.selectedProduct && newProduct.quantity > 0,
)
// 🟩 Fetch provinces
async function fetchProvinces() {
  // ✅ Only skip if user has no country_code
  if (!auth.userDetails?.country_code) {
    console.warn('❌ No country_code found for current user')
    return
  }

  console.log('🔍 Fetching provinces for country_code:', auth.userDetails.country_code)

  const { data, error } = await supabase
    .from('province')
    .select('name, province_code')
    .eq('country_code', auth.userDetails.country_code)

  if (error) {
    console.error('⚠️ Error fetching provinces:', error.message)
  } else {
    //console.log('✅ Provinces fetched:', data)
    provinceOptions.value = data
  }
}

async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('productname, productcode')
    .eq('status', 'active')

  if (!error) {
    activeProducts.value = data
    filteredProducts.value = data // initialize search list
  }
}

function filterProducts(val, update) {
  if (val === '') {
    update(() => {
      filteredProducts.value = activeProducts.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredProducts.value = activeProducts.value.filter((p) =>
      p.productname.toLowerCase().includes(needle),
    )
  })
}
// =======================================================
// 🟨 Identify the correct stock table based on dispatchType
// =======================================================

// =======================================================
// 🟨 Identify the correct stock table based on dispatchType
// =======================================================
function getStockTable() {
  const from = typeof fromValue.value === 'object' ? fromValue.value : {}
  const to = typeof toValue.value === 'object' ? toValue.value : {}

  switch (dispatchType.value) {
    case 'SHOP':
      // DPC → Shop: Deduct from Province (e.g., RCD)
      return from.province_code || auth.userDetails?.province_code || null

    case 'DPC':
      // Province → Province: Deduct from source province
      return from.province_code || auth.userDetails?.province_code || null

    case 'PROMOS':
    case 'DEBTS':
    case 'EXPIRY':
      // Shop → PROMOS/DEBTS/EXPIRY
      if (from.shopcode) return `${from.shopcode}_STOCK`
      if (to.shopcode) return `${to.shopcode}_STOCK`
      if (auth.userDetails?.shopcode) return `${auth.userDetails.shopcode}_STOCK`
      return null

    default:
      return null
  }
}

// =======================================================
// 🟧 Fetch stock quantity for selected product
// =======================================================

async function fetchStockQuantity() {
  const table = getStockTable()
  const product =
    typeof selectedProduct.value === 'object'
      ? selectedProduct.value.productcode
      : selectedProduct.value

  if (!table || !product) {
    availableStock.value = 0
    return
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select('quantity')
      .eq('productcode', product)
      .maybeSingle()

    if (error) {
      console.error(`Error fetching stock from ${table}:`, error)
      availableStock.value = 0
    } else {
      availableStock.value = data?.quantity || 0
    }
  } catch (err) {
    console.error('Stock fetch error:', err)
    availableStock.value = 0
  }
}

// Function to fetch stock for selected province and product
async function fetchProvinceStock() {
  const tableName =
    typeof newProduct.selectedProvince === 'object'
      ? newProduct.selectedProvince.province_code
      : newProduct.selectedProvince

  const productCode =
    typeof newProduct.selectedProduct === 'object'
      ? newProduct.selectedProduct.productcode
      : newProduct.selectedProduct

  if (!tableName || !productCode) {
    provinceStock.value = 0
    return
  }

  try {
    const { data: existing, error } = await supabase
      .from(tableName)
      .select('quantity')
      .eq('productcode', productCode)
      .maybeSingle() // returns null if not found

    if (error) throw error
    provinceStock.value = existing?.quantity || 0
  } catch (err) {
    console.error('Error fetching province stock:', err)
    provinceStock.value = 0
  }
}

watch(dispatchType, () => populateSelects(false))

// =======================================================
// 🟦 Watch for changes to trigger stock lookup
// =======================================================
watch([dispatchType, fromValue, toValue, selectedProduct], () => {
  // Prevent crash when product is not yet selected
  if (!selectedProduct.value || typeof selectedProduct.value !== 'object') {
    availableStock.value = 0
    return
  }

  fetchStockQuantity()
})

// Automatically set the correct default
watch(
  [isAdmin, isSuperAdmin, userDPCCODE],
  ([admin, superAdmin, dpc]) => {
    if (admin || superAdmin) {
      fromValue.value = null // user will select manually
    } else {
      fromValue.value = dpc // automatically use current user's DPC
    }
  },
  { immediate: true }, // run immediately on component mount
)

watch(dispatchDate, (newDate) => {
  if (newDate) {
    localStorage.setItem('dispatchDate', newDate)
  }
})

// Watch for changes in province or product selection
watch(
  () => [newProduct.selectedProvince, newProduct.selectedProduct],
  () => fetchProvinceStock(),
)

watch(
  () => auth.userDetails,
  (newVal) => {
    if (isUser.value && newVal) {
      fromValue.value = {
        dpc_id: newVal.dpc_id,
        province_code: newVal.province_code,
        shopcode: newVal.shopcode,
      }
    }
  },
)

async function submitProductAddition() {
  try {
    // Validate selection
    if (!newProduct.selectedProvince || !newProduct.selectedProduct) {
      throw new Error('Please select a province and product')
    }

    // Extract province_code string from Proxy/object
    const tableName =
      typeof newProduct.selectedProvince === 'object'
        ? newProduct.selectedProvince.province_code
        : newProduct.selectedProvince

    if (!tableName) throw new Error('No province selected')

    // Extract productcode string from Proxy/object
    const productCode =
      typeof newProduct.selectedProduct === 'object'
        ? newProduct.selectedProduct.productcode
        : newProduct.selectedProduct

    if (!productCode) throw new Error('No product selected')

    // Fetch if product already exists
    const { data: existing, error: fetchError } = await supabase
      .from(tableName)
      .select('quantity')
      .eq('productcode', productCode)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    // Insert or update stock
    if (existing) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          quantity: existing.quantity + newProduct.quantity,
          expirydate: newProduct.expiryDate || null,
          dateadded: newProduct.dateAdded || null,
          modifiedby: auth.userDetails?.firstname || 'system',
        })
        .eq('productcode', productCode)

      if (updateError) throw updateError

      $q.notify({ type: 'info', message: 'Product exists: quantity updated!' })
    } else {
      const { error: insertError } = await supabase.from(tableName).insert({
        productcode: productCode,
        quantity: newProduct.quantity,
        expirydate: newProduct.expiryDate || null,
        dateadded: newProduct.dateAdded || null,
        modifiedby: auth.userDetails?.firstname || 'system',
      })

      if (insertError) throw insertError

      $q.notify({ type: 'positive', message: 'Product added successfully!' })
    }

    // 🔹 Log to dispatchlogs table directly
    const currentUser = auth.userDetails?.firstname || 'system'
    const { error: logError } = await supabase.from('dispatchlogs').insert({
      from_location: currentUser, // current user as source
      to_location:
        typeof newProduct.selectedProvince === 'object'
          ? newProduct.selectedProvince.province_code
          : newProduct.selectedProvince,
      productcode: productCode,
      quantity: newProduct.quantity,
      dispatchedby: currentUser,
      status: 'STORE_ADDITION',
    })

    if (logError) throw logError

    // Reset form
    Object.assign(newProduct, {
      selectedProvince: null,
      selectedProduct: null,
      quantity: 1,
      dateAdded: '',
      expiryDate: '',
    })

    $q.notify({ type: 'positive', message: 'Dispatch log recorded successfully!' })
  } catch (err) {
    console.error('Error adding product:', err)
    $q.notify({ type: 'negative', message: err.message })
  }
}

function filterActiveProducts(val, update) {
  if (val === '') return update(() => activeProducts.value)
  update(() =>
    activeProducts.value.filter((p) => p.productname.toLowerCase().includes(val.toLowerCase())),
  )
}

function onDispatchDateChange(newDate) {
  if (!newDate) return

  const selected = new Date(newDate)
  const today = new Date()

  // Compare with CURRENT MONTH & YEAR
  const isSameMonth =
    selected.getMonth() === today.getMonth() && selected.getFullYear() === today.getFullYear()

  if (!isSameMonth) {
    Dialog.create({
      title: 'Confirm Date Selection',
      message: 'You are selecting a date outside the current month. Are you sure?',
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        // ✅ Accept new date
        dispatchDate.value = newDate
        localStorage.setItem('dispatchDate', newDate)
      })
      .onCancel(() => {
        // 🔁 Revert to current date
        const current = new Date().toISOString().slice(0, 10)
        dispatchDate.value = current
        localStorage.setItem('dispatchDate', current)
      })
  } else {
    // ✅ Same month → accept silently
    dispatchDate.value = newDate
    localStorage.setItem('dispatchDate', newDate)
  }
}
let previousDispatchType = dispatchType.value
const options = [
  { label: 'SHOPS', value: 'SHOP' },
  { label: 'DPC', value: 'DPC' },

  { label: 'PROMOS', value: 'PROMOS' },
  { label: 'DEBTS', value: 'DEBTS' },
  { label: 'EXPIRY', value: 'EXPIRY' },
]

// Filter options based on user role
const filteredOptions = computed(() => {
  if (isAdmin.value || isSuperAdmin.value) {
    return options
  }
  return options.filter((opt) => ['PROMOS', 'DEBTS', 'EXPIRY'].includes(opt.value))
})

const fromLabel = computed(() => {
  if (['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType.value)) return 'shop_name'
  return 'name'
})

const fromValueKey = computed(() => {
  if (['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType.value)) return 'shopcode'
  return 'province_code'
})

const fromLabelText = computed(() => {
  if (['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType.value)) return 'From (Shop)'
  return 'From (Province)'
})

const toLabel = computed(() => (dispatchType.value === 'DPC' ? 'name' : 'shop_name'))
const toValueKey = computed(() => (dispatchType.value === 'DPC' ? 'province_code' : 'shopcode'))
const toLabelText = computed(() => (dispatchType.value === 'DPC' ? 'To (Province)' : 'To (Shop)'))

// ✅ Load all provinces for user's country
async function loadProvinces() {
  const { data, error } = await supabase
    .from('province')
    .select('province_code, name')
    .eq('country_code', auth.userDetails?.country_code)
    .order('name')

  if (error) console.error('Province error:', error)
  else localProvinces.value = data
}

// ✅ Load shops for user's country or province depending on role
async function loadShops() {
  let query = supabase.from('shops').select('shopcode, shop_name, province_code, country_code')

  if (isSuperAdmin.value) {
    query = query.eq('country_code', auth.userDetails?.country_code)
  } else if (isAdmin.value) {
    query = query.eq('province_code', auth.userDetails?.province_code)
  }

  const { data, error } = await query
  if (error) console.error('Shops error:', error)
  else localShops.value = data
}

function populateSelects(triggeredByUser = false) {
  const userProvinceCode = auth.userDetails?.province_code
  const userProvince = localProvinces.value.find((p) => p.province_code === userProvinceCode)

  /* ==============================
     🚫 ADMIN SHOP PROVINCE GUARD
  ============================== */
  if (
    dispatchType.value === 'SHOP' &&
    triggeredByUser &&
    isAdminRestrictedFrom.value &&
    fromValue.value &&
    fromValue.value.province_code !== userProvinceCode
  ) {
    $q.notify({
      type: 'warning',
      message: 'You can only dispatch to shops within your province',
    })

    fromValue.value = userProvince || null
    toOptions.value = localShops.value.filter((s) => s.province_code === userProvinceCode)
    toValue.value = null
    return
  }

  /* =======================
     DPC
  ======================= */
  if (dispatchType.value === 'DPC') {
    if (isAdminRestrictedFrom.value) {
      fromOptions.value = userProvince ? [userProvince] : []

      if (!triggeredByUser) {
        fromValue.value = userProvince || null
      }

      toOptions.value = localProvinces.value.filter((p) => p.province_code !== userProvinceCode)

      if (!triggeredByUser) {
        toValue.value = null
      }
    } else {
      fromOptions.value = localProvinces.value
      toOptions.value = localProvinces.value

      if (!triggeredByUser) {
        fromValue.value = null
        toValue.value = null
      }
    }

    return
  }

  /* =======================
     SHOP
  ======================= */
  if (dispatchType.value === 'SHOP') {
    if (isAdminRestrictedFrom.value) {
      fromOptions.value = userProvince ? [userProvince] : []
      fromValue.value = userProvince || null

      toOptions.value = localShops.value.filter((s) => s.province_code === userProvinceCode)
      toValue.value = null
    } else {
      fromOptions.value = localProvinces.value

      toOptions.value = fromValue.value
        ? localShops.value.filter((s) => s.province_code === fromValue.value.province_code)
        : []

      toValue.value = null
    }

    return
  }

  /* =======================
     PROMOS / EXPIRY / DEBTS
  ======================= */
  if (['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType.value)) {
    fromOptions.value = isSuperAdmin.value
      ? localShops.value
      : localShops.value.filter((s) => s.province_code === userProvinceCode)

    if (!triggeredByUser) {
      fromValue.value = null
    }

    toOptions.value = []
    toValue.value = null
  }
}

function resetDispatchForm() {
  //dispatchType.value = null
  //fromValue.value = null
  //toValue.value = null
  //dispatchDate.value = ''
  expiryDate.value = ''
  distributoridno.value = ''
  distributorname.value = ''
  selectedProduct.value = null
  availableStock.value = 0
  dispatchQty.value = 0
}

const isAdminRestrictedFrom = computed(() => {
  return isAdmin.value && !isSuperAdmin.value && ['SHOPS', 'DPC'].includes(dispatchType.value)
})

// ✅ Watch for dispatch type change
//watch(dispatchType, () => populateSelects())

watch(dispatchType, (newVal, oldVal) => {
  if (oldVal === newVal) return

  Dialog.create({
    title: 'Confirm Change',
    message: `Are you sure you want to switch to "${newVal}"?`,
    cancel: true,
    persistent: true,
  })
    .onOk(() => {
      // User confirmed → keep the new value
      previousDispatchType = newVal
      populateSelects() // your function
    })
    .onCancel(() => {
      // User cancelled → revert to previous value
      dispatchType.value = previousDispatchType
    })
})

onMounted(async () => {
  await loadProvinces()
  await fetchProvinces()
  await fetchActiveProducts()
  await loadShops()
  populateSelects()
  getModifiedBy()

  // If nothing stored, default to today
  if (!dispatchDate.value) {
    dispatchDate.value = new Date().toISOString().slice(0, 10)
  }

  // Baseline = last accepted date (stored or today)
  //previousDate = dispatchDate.value

  if (isUser.value) {
    // Automatically assign the user’s DPC/shop/province for later stock operations
    fromValue.value = {
      dpc_id: auth.userDetails?.dpc_id || null,
      shopcode: auth.userDetails?.dpc_id || null,
    }
  }
})

// =======================================================
// 🛠️ Helpers
// =======================================================

// Extract a primitive value safely from v-model (avoiding [object Object])
function getValue(obj, key) {
  if (!obj) return null
  if (typeof obj === 'object' && obj[key]) return obj[key]
  return obj
}

// Get current user's name for audit
function getModifiedBy() {
  return auth.userDetails?.firstname || 'system'
}

async function handleShopDispatch() {
  if (loading.value) return
  loading.value = true

  try {
    const province = getValue(fromValue.value, 'province_code')
    const shop = getValue(toValue.value, 'shopcode')
    const product = getValue(selectedProduct.value, 'productcode')
    const productname = getValue(selectedProduct.value, 'productname')
    const qty = Number(dispatchQty.value)

    const { error } = await supabase.rpc('transfer_stock', {
      p_province: province, // ✅ 1st
      p_shopcode: shop, // ✅ 2nd
      p_productcode: product, // ✅ 3rd
      p_productname: productname, // ✅ 4th
      p_quantity: qty, // ✅ 5th
      p_modifiedby: getModifiedBy(), // ✅ 6th
      p_dispatch_date: dispatchDate.value, // ✅ 7th
      p_dispatchtype: dispatchType.value, // ✅ 8t
    })

    if (error) throw error

    // 🟢 SUCCESS MESSAGE
    $q.notify({
      type: 'positive',
      position: 'top',
      message: `✅ ${qty} × ${productname} successfully dispatched from ${province} → ${shop}`,
      timeout: 3500,
      actions: [{ icon: 'close', color: 'white' }],
    })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message,
    })
  } finally {
    loading.value = false
  }
}

async function handleDPCDispatch() {
  if (loading.value) return
  loading.value = true

  try {
    const fromStore = getValue(fromValue.value, 'province_code') // source store table
    const toStore = getValue(toValue.value, 'province_code') // destination store table
    const productCode = getValue(selectedProduct.value, 'productcode')
    const qty = Number(dispatchQty.value)

    if (!fromStore || !toStore || !productCode) {
      throw new Error('Please select source and destination stores and a product.')
    }
    if (fromStore === toStore) {
      throw new Error('Source and destination stores cannot be the same.')
    }
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid quantity.')
    }

    const { error } = await supabase.rpc('transfer_store_stock', {
      p_from_store: fromStore, // must be first
      p_to_store: toStore, // second
      p_productcode: productCode, // third
      p_quantity: qty, // fourth
      p_modifiedby: getModifiedBy(), // fifth
      p_dispatch_date: dispatchDate.value, // sixth
      p_dispatchtype: dispatchType.value, // seventh
    })

    if (error) throw error

    $q.notify({
      type: 'positive',
      message: `✅ ${qty} x ${productCode} moved from ${fromStore} → ${toStore}`,
      position: 'top',
      timeout: 5000,
      icon: 'mdi-truck-delivery',
    })

    dispatchQty.value = 0
    selectedProduct.value = null
  } catch (err) {
    console.error('DPC Dispatch error:', err)
    $q.notify({
      type: 'negative',
      message: err.message,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

// =======================================================
// 🟦 3️⃣ PROMOS DISPATCH: Shop → PROMOS table
// =======================================================

async function handlePromoDispatch() {
  if (loading.value) return
  loading.value = true

  try {
    const shop = getValue(fromValue.value, 'shopcode') // dynamic shop table
    const productCode = getValue(selectedProduct.value, 'productcode')
    const distributorId = distributoridno.value?.trim()
    const distributorName = distributorname.value || null
    const qty = Number(dispatchQty.value)
    const date = dispatchDate.value || null

    if (!shop || !productCode || !distributorId) {
      throw new Error('Please select shop, product, and distributor ID.')
    }
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid quantity.')
    }

    const { error } = await supabase.rpc('promo_dispatch', {
      p_shop_table: `${shop}_STOCK`,
      p_productcode: productCode,
      p_quantity: qty,
      p_distributorid: distributorId,
      p_distributorname: distributorName,
      p_date: date,
      p_modifiedby: getModifiedBy(),
    })

    if (error) throw error

    $q.notify({
      type: 'positive',
      message: `🎁 ${qty} promo units of ${productCode} sent to ${distributorId}`,
      position: 'top',
      timeout: 5000,
      icon: 'mdi-gift',
    })

    // Reset fields
    dispatchQty.value = 0
    selectedProduct.value = null
    distributoridno.value = ''
    distributorname.value = ''
  } catch (err) {
    console.error('Promo Dispatch error:', err)
    $q.notify({
      type: 'negative',
      message: err.message,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

// =======================================================
// 🟦 4️⃣ EXPIRY DISPATCH: Shop → Expiry table (unique entries)
// =======================================================

async function handleExpiryDispatch() {
  if (loading.value) return
  loading.value = true

  try {
    const shop = getValue(fromValue.value, 'shopcode')
    const product = getValue(selectedProduct.value, 'productcode')
    const qty = Number(dispatchQty.value)
    const expDate = expiryDate.value
    const table = `${shop}_STOCK`

    if (!shop || !product || isNaN(qty) || qty <= 0)
      throw new Error('Please select shop, product, and valid quantity.')

    if (!expDate) throw new Error('Please provide an expiry date.')

    const { error } = await supabase.rpc('expiry_dispatch', {
      p_shop_table: table,
      p_productcode: product,
      p_quantity: qty,
      p_expirydate: expDate,
      p_modifiedby: getModifiedBy(),
      p_dispatch_date: dispatchDate.value, // ✅ IMPORTANT
    })

    if (error) throw new Error(error.message)

    $q.notify({
      type: 'positive',
      message: `🧾 ${qty} expired units of ${product} recorded successfully.`,
    })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loading.value = false
  }
}

// =======================================================
// 🟦 5️⃣ DEBTS DISPATCH: Shop → DEBTS table
// =======================================================

async function handleDebtDispatch() {
  if (loading.value) return
  loading.value = true

  try {
    const shop = getValue(fromValue.value, 'shopcode')
    const product = getValue(selectedProduct.value, 'productcode')
    const distributor = distributoridno.value?.trim()
    const distributorName = distributorname.value || null
    const qty = Number(dispatchQty.value)
    const date = dispatchDate.value || new Date().toISOString().slice(0, 10)

    if (!shop || !product || !distributor)
      throw new Error('Please select shop, product, and distributor ID.')
    if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity.')

    const table = `${shop}_STOCK`

    const { error } = await supabase.rpc('debt_dispatch', {
      p_shop_table: table,
      p_productcode: product,
      p_quantity: qty,
      p_distributorid: distributor,
      p_distributorname: distributorName,
      p_date: date,
      p_addedby: getModifiedBy(),
    })

    if (error) throw new Error(error.message)

    $q.notify({
      type: 'warning',
      message: `💳 ${qty} of ${product} recorded as debt for ${distributor}`,
    })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loading.value = false
  }
}

// =======================================================
// REUSABLE LOGGING FUNCTION
// =======================================================

// =======================================================
// 🟩 Master Dispatch Controller
// =======================================================
async function submitDispatch() {
  try {
    if (!dispatchType.value) throw new Error('Please select a dispatch type.')

    switch (dispatchType.value) {
      case 'SHOP':
        await handleShopDispatch()
        break

      case 'DPC':
        await handleDPCDispatch()
        break

      case 'PROMOS':
        await handlePromoDispatch()
        break

      case 'EXPIRY':
        await handleExpiryDispatch()
        break

      case 'DEBTS':
        await handleDebtDispatch()
        break

      default:
        throw new Error('Unknown dispatch type selected.')
    }
    // ✅ Call reusable reset after successful submission
    resetDispatchForm()
  } catch (err) {
    console.error('Dispatch error:', err)
    $q.notify({ type: 'negative', message: err.message })
  }
}
</script>

<style scoped>
/* Make radio group shrink proportionally on mobile */
.dispatch-type-group {
  transform: scale(1);
  transition: transform 0.2s ease;
}

@media (max-width: 600px) {
  .dispatch-type-group {
    transform: scale(0.85);
  }
}

/* Ensure all selects/inputs align perfectly */
.full-width {
  width: 100%;
}
.dispatch-option-label.active {
  color: #f5100c; /* light-green-14 */
  font-weight: bold;
}

.dispatch-option-label.inactive {
  color: #100f0f; /* grey-6 */
  font-weight: normal;
}
</style>
