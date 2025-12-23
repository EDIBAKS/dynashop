<template>
  <q-card flat bordered class="q-pa-md bg-transparent" style="max-width: 600px; margin: auto">
    <q-form ref="formRef" @submit.prevent="submitWithdrawJS" class="column q-gutter-md">
      <!-- 🟦 Withdraw Type -->
      <div class="text-center text-subtitle2 text-bold">Withdraw Type</div>
      <q-option-group
        v-model="withdrawType"
        :options="withdrawOptions"
        type="radio"
        inline
        color="blue"
      />

      <!-- 🟩 From Select -->
      <q-select
        v-model="selectedFrom"
        :options="fromOptions"
        option-label="name"
        option-value="code"
        label="From"
        dense
        outlined
        emit-value
        map-options
      />

      <!-- 🟩 To Select -->
      <q-select
        v-model="selectedTo"
        :options="toOptions"
        option-label="name"
        option-value="code"
        label="To"
        dense
        outlined
        emit-value
        map-options
      />

      <!-- 🟩 Product Select -->
      <q-select
        v-model="selectedProduct"
        :options="filteredProducts"
        option-label="productname"
        option-value="productcode"
        label="Select Product"
        dense
        outlined
        emit-value
        map-options
        use-input
        input-debounce="300"
        fill-input
        hide-selected
        @filter="filterProducts"
        @update:model-value="onProductSelected"
      />

      <!-- 🟦 Available Stock -->
      <q-input
        v-model="availableStock"
        label="Available Stock"
        readonly
        dense
        outlined
        input-class="text-blue text-bold text-center"
      />

      <!-- 🟨 Quantity -->
      <q-input
        v-model.number="quantity"
        type="number"
        label="Quantity to Withdraw"
        dense
        outlined
        lazy-rules
        :rules="[
          (val) => val > 0 || 'Enter a valid quantity',
          (val) => val <= availableStock || 'Cannot exceed available stock',
        ]"
      />

      <!-- 🟩 Submit -->
      <div class="text-center q-mt-md">
        <q-btn label="Submit Withdrawal" type="submit" color="primary" :disable="!formReady" />
      </div>
    </q-form>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, useQuasar } from 'quasar'
import { supabase } from 'src/boot/supabase'
import { useAuth } from 'stores/auth'

const $q = useQuasar()
const auth = useAuth()

// 🟦 Form state
const withdrawType = ref('DPC') // ✅ Default to Province (DPC)
const selectedFrom = ref(null)
const selectedTo = ref(null)
const selectedProduct = ref(null)
const availableStock = ref(0)
const quantity = ref(0)
const formRef = ref(null)
// 🟦 Options
const withdrawOptions = [
  { label: 'DPC', value: 'DPC' },
  { label: 'SHOP', value: 'SHOP' },
]

// 🟦 Data lists
const activeProducts = ref([])
const provinceOptions = ref([])
const shopOptions = ref([])
const fromOptions = ref([])
const toOptions = ref([])

// ✅ Fetch provinces for the current user’s country
async function fetchProvinces() {
  const { data, error } = await supabase
    .from('province')
    .select('name, province_code')
    .eq('country_code', auth.userDetails?.country_code)

  if (!error && data) provinceOptions.value = data
}

// ✅ Fetch shops based on user’s role
async function fetchShops() {
  let query = supabase.from('shops').select('shopcode, shop_name, province_code, country_code')

  if (auth.userDetails?.role === 'Admin') {
    query = query.eq('province_code', auth.userDetails?.province_code)
  } else if (auth.userDetails?.role === 'SuperAdmin') {
    query = query.eq('country_code', auth.userDetails?.country_code)
  }

  const { data, error } = await query
  if (!error && data) shopOptions.value = data
}

// ✅ Fetch active products
async function fetchActiveProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('productname, productcode')
    .eq('status', 'active')

  if (!error && data) {
    activeProducts.value = data
    filteredProducts.value = data // 👈 important
  }
}

function onProductSelected() {
  // 🚫 FROM not selected
  if (!selectedFrom.value) {
    $q.notify({
      type: 'warning',
      message: 'Please select FROM location first',
      position: 'top',
    })

    // 🔄 Reset product
    selectedProduct.value = null
    availableStock.value = 0
    return
  }

  // ✅ FROM selected → proceed
  fetchAvailableStock()
}

// ✅ Populate select lists based on selected type
function populateOptions() {
  if (withdrawType.value === 'DPC') {
    if (auth.userDetails?.role === 'SuperAdmin') {
      // SuperAdmin → can withdraw from any province
      fromOptions.value = provinceOptions.value.map((p) => ({
        name: p.name,
        code: p.province_code,
      }))
      toOptions.value = provinceOptions.value.map((p) => ({ name: p.name, code: p.province_code }))
    } else {
      // Admin → cannot withdraw from DPC
      fromOptions.value = [] // empty
      toOptions.value = [] // empty
      selectedFrom.value = null
      selectedTo.value = null
      $q.notify({
        type: 'warning',
        message: 'Admins cannot withdraw from DPC. Please select SHOP.',
      })
    }
  } else if (withdrawType.value === 'SHOP') {
    // FROM → only shops within admin's province
    let filteredShops = shopOptions.value
    if (auth.userDetails?.role === 'Admin') {
      filteredShops = shopOptions.value.filter(
        (s) => s.province_code === auth.userDetails.province_code,
      )
    }

    fromOptions.value = filteredShops.map((s) => ({ name: s.shop_name, code: s.shopcode }))

    // TO → province store (Admin can only return to their province)
    let filteredProvinces = provinceOptions.value
    if (auth.userDetails?.role === 'Admin') {
      filteredProvinces = provinceOptions.value.filter(
        (p) => p.province_code === auth.userDetails.province_code,
      )
    }
    toOptions.value = filteredProvinces.map((p) => ({ name: p.name, code: p.province_code }))

    // Reset selected values
    selectedFrom.value = null
    selectedTo.value = null
  }
}

const filteredProducts = ref([])

/**
 * Called automatically when user types in the select
 */
function filterProducts(val, update) {
  // 🚫 Prevent searching before FROM is selected
  if (!selectedFrom.value) {
    update(() => {
      filteredProducts.value = []
    })
    return
  }

  update(() => {
    if (!val) {
      filteredProducts.value = activeProducts.value
    } else {
      const needle = val.toLowerCase()
      filteredProducts.value = activeProducts.value.filter((p) =>
        p.productname.toLowerCase().includes(needle),
      )
    }
  })
}

watch(withdrawType, async (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) {
    Dialog.create({
      title: 'Confirm Switch',
      message: `Switch withdraw type to ${newVal}? This will reset your form.`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        selectedFrom.value = null
        selectedTo.value = null
        selectedProduct.value = null
        availableStock.value = 0
        quantity.value = null
        populateOptions() // applies role restrictions
      })
      .onCancel(() => {
        withdrawType.value = oldVal // revert
      })
  } else {
    populateOptions()
  }
})

// ✅ Watcher for withdrawType — triggers when user switches
watch(withdrawType, async (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) {
    Dialog.create({
      title: 'Confirm Switch',
      message: `Switch withdraw type to ${newVal}? This will reset your form.`,
      cancel: true,
      persistent: true,
    })
      .onOk(() => {
        selectedFrom.value = null
        selectedTo.value = null
        selectedProduct.value = null
        availableStock.value = 0
        quantity.value = null
        populateOptions()
      })
      .onCancel(() => {
        withdrawType.value = oldVal // revert to previous
      })
  } else {
    // Initial mount setup
    populateOptions()
  }
})

// ✅ Fetch available stock from dynamic table
async function fetchAvailableStock() {
  if (!withdrawType.value || !selectedFrom.value || !selectedProduct.value) return

  // Determine the table name based on withdraw type
  let tableName = ''
  if (withdrawType.value === 'DPC') {
    // For provinces, table name is just the province_code
    tableName = selectedFrom.value
  } else if (withdrawType.value === 'SHOP') {
    // For shops, table name is <shopcode>_STOCK
    tableName = `${selectedFrom.value}_STOCK`
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('quantity')
      .eq('productcode', selectedProduct.value)
      .maybeSingle()

    if (!error && data) {
      availableStock.value = data.quantity || 0
    } else {
      availableStock.value = 0
    }
  } catch (err) {
    console.error('Error fetching stock:', err)
    availableStock.value = 0
  }
}

const submitWithdrawJS = async () => {
  // 🔐 Always validate the form first
  const valid = await formRef.value.validate()
  if (!valid) return

  try {
    const qty = quantity.value
    const product = selectedProduct.value
    const currentUser = auth.userDetails?.firstname || 'Unknown'

    // 🔹 Determine FROM and TO
    let fromTable
    let toProvince

    if (withdrawType.value === 'DPC') {
      // Province → Province
      fromTable = selectedFrom.value.toUpperCase()
      toProvince = selectedTo.value.toUpperCase()
    } else if (withdrawType.value === 'SHOP') {
      // Shop → Province
      fromTable = `${selectedFrom.value.toUpperCase()}_STOCK`
      toProvince = selectedTo.value.toUpperCase()
    } else {
      throw new Error('Invalid withdrawal type')
    }

    // 🚀 Call RPC
    const { error } = await supabase.rpc('withdraw_stock', {
      p_from_table: fromTable,
      p_to_province: toProvince,
      p_productcode: product,
      p_quantity: qty,
      p_createdby: currentUser,
    })

    if (error) throw error

    // ✅ Success
    $q.notify({
      type: 'positive',
      message: `📦 ${qty} ${product} transferred successfully`,
    })

    // 🔄 Reset form state
    selectedFrom.value = null
    selectedTo.value = null
    selectedProduct.value = null
    quantity.value = 0
    availableStock.value = 0

    formRef.value.resetValidation()
  } catch (err) {
    console.error(err)

    $q.notify({
      type: 'negative',
      message: err.message || 'Withdrawal failed',
    })
  }
}

// 🧠 Form Ready Check
const formReady = computed(() => {
  return (
    !!withdrawType.value &&
    !!selectedFrom.value &&
    !!selectedTo.value &&
    !!selectedProduct.value &&
    quantity.value > 0 &&
    quantity.value <= availableStock.value
  )
})

// 🟩 On mount: load data and default DPC mode
onMounted(async () => {
  await fetchProvinces()
  await fetchShops()
  await fetchActiveProducts()
  populateOptions()
})
</script>
