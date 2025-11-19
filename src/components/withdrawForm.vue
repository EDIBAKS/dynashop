<template>
  <q-card flat bordered class="q-pa-md bg-transparent" style="max-width: 600px; margin: auto">
    <q-form @submit.prevent="submitWithdrawJS" class="column q-gutter-md">
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
        :options="activeProducts"
        option-label="productname"
        option-value="productcode"
        label="Select Product"
        dense
        outlined
        emit-value
        map-options
        @update:model-value="fetchAvailableStock"
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
const quantity = ref(null)

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

  if (!error && data) activeProducts.value = data
}

// ✅ Populate select lists based on selected type
function populateOptions() {
  if (withdrawType.value === 'DPC') {
    // Both FROM and TO will show provinces
    const provinces = provinceOptions.value.map((p) => ({
      name: p.name,
      code: p.province_code,
    }))
    fromOptions.value = provinces
    toOptions.value = provinces
  } else if (withdrawType.value === 'SHOP') {
    // Both FROM and TO will show shops
    const shops = shopOptions.value.map((s) => ({
      name: s.shop_name,
      code: s.shopcode,
    }))
    fromOptions.value = shops
    toOptions.value = shops
  }
}

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

async function submitWithdrawJS() {
  const qty = quantity.value
  const currentUser = auth.userDetails?.firstname || 'Unknown'
  const fromTable =
    withdrawType.value === 'DPC' ? selectedFrom.value : `${selectedFrom.value}_STOCK`
  const toTable = withdrawType.value === 'DPC' ? selectedTo.value : `${selectedTo.value}_STOCK`

  try {
    // 1️⃣ Check and reduce stock in "from" table
    const { data: fromData } = await supabase
      .from(fromTable)
      .select('quantity')
      .eq('productcode', selectedProduct.value)
      .maybeSingle()

    if (!fromData || fromData.quantity < qty) throw new Error('Insufficient stock')

    await supabase
      .from(fromTable)
      .update({
        quantity: fromData.quantity - qty,
        modifiedby: currentUser,
        lastmodified: new Date(), // optional timestamp
      })
      .eq('productcode', selectedProduct.value)

    // 2️⃣ Add stock to "to" table
    const { data: toData } = await supabase
      .from(toTable)
      .select('quantity')
      .eq('productcode', selectedProduct.value)
      .maybeSingle()

    if (toData) {
      await supabase
        .from(toTable)
        .update({
          quantity: toData.quantity + qty,
          modifiedby: currentUser,
          lastmodified: new Date(), // optional timestamp
        })
        .eq('productcode', selectedProduct.value)
    } else {
      await supabase
        .from(toTable)
        .insert([{ productcode: selectedProduct.value, quantity: qty, modifiedby: currentUser }])
    }

    // 3️⃣ Record withdrawal
    await supabase.from('withdraws').insert([
      {
        id: crypto.randomUUID(),
        datecreated: new Date(),
        from: selectedFrom.value,
        to: selectedTo.value,
        productcode: selectedProduct.value,
        quantity: qty,
        createdby: currentUser,
      },
    ])

    $q.notify({ type: 'positive', message: 'Withdrawal successful!' })

    // ✅ Reset form
    selectedFrom.value = null
    selectedTo.value = null
    selectedProduct.value = null
    quantity.value = null
    availableStock.value = 0
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}

// 🧠 Form Ready Check
const formReady = computed(
  () => selectedFrom.value && selectedTo.value && selectedProduct.value && quantity.value,
)

// 🟩 On mount: load data and default DPC mode
onMounted(async () => {
  await fetchProvinces()
  await fetchShops()
  await fetchActiveProducts()
  populateOptions()
})
</script>
