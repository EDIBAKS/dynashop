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
      <q-input
        v-if="dispatchType === 'SHOP'"
        :model-value="fromValue?.dpc_id || auth.userDetails?.dpc_id"
        label="From (DPC)"
        readonly
        dense
        outlined
      />

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
      Add Product to Main Store / Province
    </div>

    <q-form
      v-if="isAdmin || isSuperAdmin"
      @submit.prevent="submitProductAddition"
      class="column q-gutter-md"
    >
      <!-- Select Province -->

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
const dispatchDate = ref('')
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
const dispatchType = ref(isAdmin.value || isSuperAdmin.value ? 'SHOPS' : 'PROMOS')
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
    case 'SHOPS':
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

// =======================================================
// 🟦 Watch for changes to trigger stock lookup
// =======================================================
watch([dispatchType, fromValue, toValue, selectedProduct], () => {
  fetchStockQuantity()
})

watch(selectedProduct, async (newVal) => {
  if (newVal) await fetchStockQuantity()
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
let previousDispatchType = dispatchType.value
const options = [
  { label: 'SHOPS', value: 'SHOPS' },
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

function populateSelects() {
  if (dispatchType.value === 'DPC') {
    // 🔹 Both FROM and TO use provinces
    fromOptions.value = localProvinces.value
    toOptions.value = localProvinces.value
    fromValue.value = null
    toValue.value = null
  } else if (dispatchType.value === 'SHOPS') {
    // 🔹 FROM → provinces, TO → shops
    fromOptions.value = localProvinces.value

    if (isSuperAdmin.value) {
      // All shops in the country
      toOptions.value = localShops.value
    } else if (isAdmin.value) {
      // Only shops within same province
      const provinceCode = auth.userDetails?.province_code
      fromValue.value = localProvinces.value.find((p) => p.province_code === provinceCode)
      toOptions.value = localShops.value.filter((s) => s.province_code === provinceCode)
    }
  } else if (['PROMOS', 'EXPIRY', 'DEBTS'].includes(dispatchType.value)) {
    // 🔹 PROMOS, EXPIRY, and DEBTS → only one select (FROM) showing shops
    if (isSuperAdmin.value) {
      fromOptions.value = localShops.value
    } else if (isAdmin.value) {
      const provinceCode = auth.userDetails?.province_code
      fromOptions.value = localShops.value.filter((s) => s.province_code === provinceCode)
    }

    // Hide TO select for these types
    toOptions.value = []
    toValue.value = null
  }
}

function resetDispatchForm() {
  //dispatchType.value = null
  //fromValue.value = null
  //toValue.value = null
  dispatchDate.value = ''
  expiryDate.value = ''
  distributoridno.value = ''
  distributorname.value = ''
  selectedProduct.value = null
  availableStock.value = 0
  dispatchQty.value = 0
}

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
  if (loading.value) return // ⛔ Prevent double execution

  loading.value = true
  try {
    const province = getValue(fromValue.value, 'province_code')
    const shop = getValue(toValue.value, 'shopcode')
    const product = getValue(selectedProduct.value, 'productcode')
    const productname = getValue(selectedProduct.value, 'productname')
    const qty = Number(dispatchQty.value)

    if (!province || !shop || !product) {
      throw new Error('Please select Province, Shop, and Product.')
    }

    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid quantity.')
    }

    // ------------------------------------------
    // 1️⃣ RUN STOCK TRANSFER RPC
    // ------------------------------------------
    const { error } = await supabase.rpc('transfer_stock_to_shop', {
      p_province: province,
      p_shopcode: shop,
      p_productcode: product,
      p_productname: productname,
      p_quantity: qty,
      p_modifiedby: getModifiedBy(),
    })
    if (error) throw new Error(error.message)

    // ------------------------------------------
    // 2️⃣ INSERT LOG (Safe & Single Execution)
    // ------------------------------------------
    const { error: logError } = await supabase.from('dispatches').insert({
      from_location: province,
      to_location: shop,
      productcode: product,
      quantity: qty,
      createdby: getModifiedBy(),
    })

    if (logError) throw new Error(logError.message)

    // ------------------------------------------
    // 3️⃣ UI SUCCESS MESSAGE
    // ------------------------------------------
    $q.notify({
      type: 'positive',
      message: `✅ ${qty} moved from ${province} → ${shop}`,
    })
  } catch (err) {
    console.error('❌ Dispatch Error:', err.message)
    $q.notify({ type: 'negative', message: err.message })
  } finally {
    loading.value = false // 🔄 Always release lock
  }
}

// =======================================================
// 🟦 2️⃣ DPC DISPATCH: Province → Province
// =======================================================
async function handleDPCDispatch() {
  const fromProvince = getValue(fromValue.value, 'province_code')
  const toProvince = getValue(toValue.value, 'province_code')
  const product = getValue(selectedProduct.value, 'productcode')

  if (!fromProvince || !toProvince || !product)
    throw new Error('Please select both source and destination provinces and a product.')

  if (fromProvince === toProvince)
    throw new Error('Source and destination provinces cannot be the same.')

  const qty = Number(dispatchQty.value)
  if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity.')

  const { data: sourceStock, error: fetchError } = await supabase
    .from(fromProvince)
    .select('quantity')
    .eq('productcode', product)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  if (!sourceStock || sourceStock.quantity < qty) throw new Error('Insufficient stock.')

  // Deduct from source
  await supabase
    .from(fromProvince)
    .update({
      quantity: sourceStock.quantity - qty,
      modifiedby: getModifiedBy(),
    })
    .eq('productcode', product)

  // Add to destination
  const { data: destStock } = await supabase
    .from(toProvince)
    .select('quantity')
    .eq('productcode', product)
    .maybeSingle()

  if (destStock) {
    await supabase
      .from(toProvince)
      .update({
        quantity: destStock.quantity + qty,
        modifiedby: getModifiedBy(),
      })
      .eq('productcode', product)
  } else {
    await supabase.from(toProvince).insert({
      productcode: product,
      quantity: qty,
      modifiedby: getModifiedBy(),
    })
  }

  // ----------------------------------------------------------------------
  // ✅ 1. Log to dispatchlogs (your existing function)
  // ----------------------------------------------------------------------
  await logDispatch({
    from: fromProvince,
    to: toProvince,
    productcode: product,
    quantity: qty,
    status: 'STORE_TRANSFER',
  })

  // ----------------------------------------------------------------------
  // ✅ 2. Write to dispatches table (NEW)
  // ----------------------------------------------------------------------
  const dispatchEntry = {
    from_location: fromProvince,
    to_location: toProvince,
    productcode: product,
    quantity: qty,
    createdby: getModifiedBy(), // adjust if you want another field name
    //status: 'Dispatched',
    datecreated: new Date().toISOString(),
  }

  const { error: dispatchInsertError } = await supabase.from('dispatches').insert(dispatchEntry)

  if (dispatchInsertError)
    throw new Error('Failed to save dispatch entry: ' + dispatchInsertError.message)

  // ----------------------------------------------------------------------

  $q.notify({
    type: 'positive',
    message: `✅ ${qty} moved ${fromProvince} → ${toProvince}`,
  })
}

// =======================================================
// 🟦 3️⃣ PROMOS DISPATCH: Shop → PROMOS table
// =======================================================
async function handlePromoDispatch() {
  const shop = getValue(fromValue.value, 'shopcode')
  const product = getValue(selectedProduct.value, 'productcode')
  const distributor = distributoridno.value?.trim()

  if (!shop || !product || !distributor)
    throw new Error('Please select shop, product, and distributor ID.')

  const fromTable = `${shop}_STOCK`
  const qty = Number(dispatchQty.value)
  if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity.')

  const { data: existing } = await supabase
    .from(fromTable)
    .select('quantity')
    .eq('productcode', product)
    .single()

  if (!existing || existing.quantity < qty) throw new Error('Insufficient shop stock.')

  // Deduct from shop
  await supabase
    .from(fromTable)
    .update({
      quantity: existing.quantity - qty,
      modifiedby: getModifiedBy(),
    })
    .eq('productcode', product)

  // Record promo entry
  await supabase.from('promos').insert({
    shopcode: shop,
    distributoridno: distributor,
    distributorname: distributorname.value || null,
    productcode: product,
    quantity: qty,
    date: dispatchDate.value || new Date().toISOString().slice(0, 10),
    addedby: getModifiedBy(),
  })
  await logDispatch({
    from: shop,
    to: distributorname.value || distributor,
    productcode: product,
    quantity: qty,
    status: 'PROMO_DISPATCH',
  })
  $q.notify({ type: 'positive', message: `🎁 ${qty} promo sent to ${distributor}` })
}
// =======================================================
// 🟦 4️⃣ EXPIRY DISPATCH: Shop → Expiry table (unique entries)
// =======================================================
async function handleExpiryDispatch() {
  const shop = getValue(fromValue.value, 'shopcode')
  const product = getValue(selectedProduct.value, 'productcode')
  const qty = Number(dispatchQty.value)
  const expDate = expiryDate.value // <-- use v-model bound ref

  if (!shop || !product || isNaN(qty) || qty <= 0)
    throw new Error('Please select shop, product, and valid quantity.')

  if (!expDate) throw new Error('Please provide an expiry date.')

  const fromTable = `${shop}_STOCK`

  // Fetch current stock from shop
  const { data: existing, error: fetchError } = await supabase
    .from(fromTable)
    .select('quantity')
    .eq('productcode', product)
    .single()

  if (fetchError) throw new Error(`Error fetching stock from ${fromTable}: ${fetchError.message}`)
  if (!existing || existing.quantity < qty) throw new Error('Not enough stock to mark expired.')

  // Deduct from shop stock
  const { error: deductError } = await supabase
    .from(fromTable)
    .update({
      quantity: existing.quantity - qty,
      modifiedby: getModifiedBy(),
    })
    .eq('productcode', product)

  if (deductError) throw new Error(`Error updating shop stock: ${deductError.message}`)

  // Insert new record in expiry table
  const { error: insertError } = await supabase.from('expiry').insert({
    shopcode: shop,
    productcode: product,
    quantity: qty,
    expirydate: expDate, // <-- user-provided date
    dateadded: new Date().toISOString().slice(0, 10),
    modifiedby: getModifiedBy(),
  })

  if (insertError) throw new Error(`Error inserting into expiry table: ${insertError.message}`)

  await logDispatch({
    from: shop,
    to: getModifiedBy(),
    productcode: product,
    quantity: qty,
    status: 'EXPIRED_STOCK',
  })

  $q.notify({ type: 'positive', message: `🧾 ${qty} expired stock recorded successfully.` })
}

// =======================================================
// 🟦 5️⃣ DEBTS DISPATCH: Shop → DEBTS table
// =======================================================
async function handleDebtDispatch() {
  const shop = getValue(fromValue.value, 'shopcode')
  const product = getValue(selectedProduct.value, 'productcode')
  const distributor = distributoridno.value?.trim()
  const qty = Number(dispatchQty.value)

  if (!shop || !product || !distributor)
    throw new Error('Please select shop, product, and distributor ID.')
  if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity.')

  const fromTable = `${shop}_STOCK`

  const { data: existing } = await supabase
    .from(fromTable)
    .select('quantity')
    .eq('productcode', product)
    .single()

  if (!existing || existing.quantity < qty) throw new Error('Insufficient shop stock.')

  // Deduct from shop
  await supabase
    .from(fromTable)
    .update({
      quantity: existing.quantity - qty,
      modifiedby: getModifiedBy(),
    })
    .eq('productcode', product)

  // Record debt
  await supabase.from('debts').insert({
    shopcode: shop,
    distributoridno: distributor,
    distributorname: distributorname.value || null,
    productcode: product,
    quantity: qty,
    date: dispatchDate.value || new Date().toISOString().slice(0, 10),
    addedby: getModifiedBy(),
  })

  $q.notify({ type: 'warning', message: `💳 ${qty} recorded as debt for ${distributor}` })
}
// =======================================================
// REUSABLE LOGGING FUNCTION
// =======================================================

async function logDispatch({ from, to, productcode, quantity }) {
  try {
    const { data, error } = await supabase.from('dispatchlogs').insert([
      {
        from_location: from,
        to_location: to,
        productcode,
        quantity,
        dispatchedby: getModifiedBy(),
      },
    ])

    if (error) {
      console.error('❌ Full Supabase error:', error)
      $q.notify({
        type: 'negative',
        message: `Error logging dispatch: ${error.message || 'Unknown error'}`,
      })
      return
    }

    console.log('✅ Dispatch log saved:', data)
  } catch (err) {
    console.error('💥 Unexpected JS error:', err)
    $q.notify({ type: 'negative', message: `Unexpected error: ${err.message}` })
  }
}

// =======================================================
// 🟩 Master Dispatch Controller
// =======================================================
async function submitDispatch() {
  try {
    if (!dispatchType.value) throw new Error('Please select a dispatch type.')

    switch (dispatchType.value) {
      case 'SHOPS':
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
