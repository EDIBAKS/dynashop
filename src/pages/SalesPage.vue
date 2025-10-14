<template>
  <q-page class="flex flex-center q-pa-md">
    <q-card
      class="q-pa-sm bg-transparent"
      style="
        max-width: 600px;
        width: 100%;
        border: 0px solid green;
        border-radius: 0;
        box-shadow: none;
      "
    >
      <!-- Header -->
      <q-card-section class="row justify-left">
        <div class="column items-end">
          <div class="text-h5 text-bold text-light-green-14">{{ shopName }}</div>
          <div class="text-subtitle1 text-white text-bold q-mt-xs">
            {{ $t('newSalesEntry') }}
          </div>
        </div>
      </q-card-section>
      <CurrencyToggle v-slot="{ convert }">
        <q-form @submit.prevent="submitSale" class="custom-form">
          <!-- Sale Date -->
          <div class="q-mb-sm">
            <div
              class="text-caption text-white text-bold q-mb-xs flex justify-between items-center"
            >
              <span>{{ $t('salesDate') }}</span>
              <span class="text-red-9 text-bold"></span>
            </div>

            <q-input
              v-model="form.salesdate"
              type="date"
              dense
              outlined
              class="white-input custom-border"
              input-class="text-white text-bold"
            />
          </div>

          <!-- Distributor ID -->
          <div class="q-mb-sm">
            <div class="text-caption text-white text-bold q-mb-xs">
              {{ $t('distributorId') }}
            </div>
            <q-input
              v-model="form.distributoridno"
              dense
              outlined
              class="white-input text-semi-bold text-center text-uppercase"
              input-class="text-white text-bold text-center text-uppercase"
              @blur="validateDistributorIDNO"
            />
          </div>

          <div v-if="distributorError" class="text-negative text-caption q-mb-md">
            {{ distributorError }}
          </div>

          <!-- Search by Name -->
          <div class="q-mb-sm">
            <div
              class="text-caption text-white text-bold q-mb-xs flex justify-between items-center"
            >
              <span>{{ $t('searchByName') }}</span>
              <span v-if="searchQuery.trim() !== '' && !confirmedDistributor" class="text-red">
                {{ $t('noResultsFound') }}
              </span>
            </div>
            <q-input
              v-model="searchQuery"
              dense
              outlined
              class="white-input text-semi-bold text-center text-uppercase"
              input-class="text-white text-bold text-center text-uppercase"
            />
          </div>

          <ul
            v-if="filteredDistributors.length && searchQuery.trim() !== '' && !confirmedDistributor"
            class="suggestion-list"
          >
            <li
              v-for="distributor in filteredDistributors"
              :key="distributor.DistributorIDNO"
              @click="selectDistributor(distributor)"
              class="distributor-option"
            >
              {{ distributor.DistributorNames }}
            </li>
          </ul>

          <!-- Receipt No & DPC Code -->
          <div class="row q-col-gutter-sm">
            <!-- DPC Code -->
            <div class="col-6">
              <div v-if="isAdmin" class="q-mb-sm">
                <div class="text-caption text-white text-bold q-mb-xs">
                  {{ $t('selectDPC') }}
                </div>
                <div class="select-wrapper">
                  <select
                    v-model="form.dpccode"
                    class="custom-select full-width text-center bg-blue-grey-10"
                  >
                    <option v-for="option in dpcOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div v-else class="q-mb-sm">
                <div class="text-caption text-white text-bold q-mb-xs">
                  {{ $t('dpcCode') }}
                </div>
                <q-input
                  v-model="form.dpccode"
                  dense
                  outlined
                  readonly
                  class="white-input full-width text-semi-bold text-center"
                  input-class="text-white text-bold text-center"
                />
              </div>
            </div>

            <!-- Receipt No -->
            <div class="col-6 q-mb-sm">
              <div class="text-caption text-white text-bold q-mb-xs">
                {{ $t('receiptNo') }}
              </div>
              <q-input
                v-model="form.receiptno"
                dense
                outlined
                ref="receiptInput"
                class="white-input"
                input-class="text-white text-bold text-center"
                @blur="validateReceiptNo"
              />
            </div>
          </div>

          <!-- Product Selector with Quantity, Price, BV -->
          <div class="q-mb-md">
            <div class="text-subtitle2 text-white q-mb-sm">{{ $t('products') }}</div>

            <div class="row q-col-gutter-sm q-mb-sm">
              <!-- Product Select -->
              <div class="col-6 q-mb-sm">
                <div class="text-caption text-white q-mb-xs">{{ $t('selectProduct') }}</div>
                <q-select
                  v-model="selectedProductCode"
                  :options="filteredProducts"
                  option-label="label"
                  option-value="value"
                  dense
                  outlined
                  emit-value
                  map-options
                  use-input
                  input-debounce="300"
                  class="white-input full-width"
                  input-class="text-white text-bold text-center"
                  popup-content-class="text-white bg-dark"
                  @filter="filterProducts"
                  @update:model-value="updateSelectedProduct"
                />
              </div>

              <!-- Quantity -->
              <div class="col-2 q-mb-sm">
                <div class="text-caption text-white q-mb-xs">{{ $t('qty') }}</div>
                <q-input
                  v-model.number="selectedQuantity"
                  type="number"
                  dense
                  outlined
                  class="white-input"
                  input-class="text-white text-bold text-center"
                  @update:model-value="updateTotals"
                />
              </div>

              <!-- Total Price -->
              <div class="col-2 q-mb-sm">
                <div class="text-caption text-white q-mb-xs">{{ $t('price') }}</div>
                <q-input
                  :model-value="totalPrice"
                  type="number"
                  dense
                  outlined
                  readonly
                  class="white-input"
                  input-class="text-white text-bold text-center"
                />
              </div>

              <!-- Total BV -->
              <div class="col-2 q-mb-sm">
                <div class="text-caption text-white q-mb-xs">{{ $t('bv') }}</div>
                <q-input
                  :model-value="totalBV"
                  type="number"
                  dense
                  outlined
                  readonly
                  class="white-input"
                  input-class="text-white text-bold text-center"
                />
              </div>

              <!-- Add Product Button -->
              <div class="col-12">
                <q-btn
                  icon="shopping_cart"
                  color="primary"
                  :label="$t('addProduct')"
                  class="full-width q-mt-sm"
                  @click="addProduct"
                />
              </div>
            </div>

            <!-- Product List -->
            <q-list bordered separator class="custom-list q-mt-md bg-blue-grey-10 text-white">
              <q-item
                v-for="(product, index) in form.items"
                :key="index"
                class="q-py-xs items-start"
              >
                <q-item-section>
                  <div class="text-subtitle2 text-white text-semi-bold">
                    {{ product.productname }}
                  </div>
                  <div class="text-caption text-white product-summary">
                    {{ $t('qty') }}: {{ product.quantity }} | {{ $t('price') }}:
                    {{ product.unitprice * product.quantity }} | {{ $t('bv') }}:
                    {{ product.unitbv * product.quantity }} | FCFA
                    <span class="q-ml-sm text-light-green-14 text-bold">
                      {{ product.unitprice * product.quantity * exchangeRate }}
                    </span>
                  </div>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense icon="delete" color="negative" @click="removeItem(index)" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <!-- Totals -->
          <div class="q-mb-md column items-end text-white">
            <!-- Total Amount -->
            <div class="row items-center">
              <div class="text-subtitle1 text-bold">{{ $t('totalAmount') }}</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ convert(totalReceiptAmount) }}</span>
              </div>
            </div>

            <!-- Total BV -->
            <div class="row items-center q-mt-xs">
              <div class="text-subtitle1 text-bold">BV</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span>{{ totalReceiptBv }}</span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <q-btn
            :label="$t('submitSale')"
            color="light-green-14"
            type="submit"
            class="full-width q-mt-md"
          />
        </q-form>
      </CurrencyToggle>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSalesStore } from '../stores/salesStore'
//import { useAuth } from '../stores/auth'
import { useQuasar } from 'quasar'
import { supabase } from '../boot/supabase'
import { useAuth } from '../stores/auth.js'
import CurrencyToggle from '../components/currencyTogle.vue'
const auth = useAuth()
const $q = useQuasar()
const store = useSalesStore()
const { t: $t, locale } = useI18n()
//const userStore = useAuth()
const loading = ref(false)
const searchQuery = ref('') // Search query for filtering
const distributors = ref([])
const filteredDistributors = ref([])
const shopName = ref('')
const DistributorIDNO = ref('')
const distributorError = ref('')
const receiptInput = ref(null)
const confirmedDistributor = ref(false)
const dpcOptions = ref([])
const salesDateError = ref('') // For date validation
//const searchError = ref('') // For "no results found"

const form = reactive({
  receiptno: '',
  distributoridno: '',
  salesdate: '',
  dpccode: '',
  createdby: auth.userDetails.firstname,
  lastModifiedby: auth.userDetails.firstname,
  entrysource: 'app',
  entered_by: auth.user.id, // maybe set from auth
  items: [],
})

const selectedProductCode = ref(null)
//const selectedQuantity = ref(1)
const selectedProduct = ref(null)

const selectedQuantity = ref(1)
const unitPrice = ref(0)
const unitBV = ref(0)

const removeItem = (index) => {
  form.items.splice(index, 1)
}

const fetchShopName = async () => {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('shop_name')
      .eq('shopcode', auth.userDetails?.dpc_id) // match the shopcode
      .maybeSingle() // returns null if no match

    if (error) {
      console.error('Error fetching shop name:', error.message)
      return
    }

    if (shop) {
      shopName.value = shop.shop_name
    } else {
      shopName.value = 'Unknown Shop'
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

//const totalPrice = computed(() => unitPrice.value * selectedQuantity.value)
//const totalBV = computed(() => unitBV.value * selectedQuantity.value)
const totalPrice = computed(() => {
  if (!unitPrice.value || !selectedQuantity.value) return ''
  return unitPrice.value * selectedQuantity.value
})

const totalBV = computed(() => {
  if (!unitBV.value || !selectedQuantity.value) return ''
  return unitBV.value * selectedQuantity.value
})
const exchangeRate = computed(() => store.headerData.exchangeRate)
const filteredProducts = ref([])

// Initially load all products as options
filteredProducts.value = store.products.map((p) => ({
  label: p.productname,
  value: p.productcode,
}))

// Filter products when typing
function filterProducts(val, update) {
  if (val === '') {
    update(() => {
      filteredProducts.value = store.products.map((p) => ({
        label: p.productname,
        value: p.productcode,
      }))
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredProducts.value = store.products
      .filter((p) => p.productname.toLowerCase().includes(needle))
      .map((p) => ({ label: p.productname, value: p.productcode }))
  })
}
//watch that quantity never goes below 1
watch(selectedQuantity, (val) => {
  if (val < 1) selectedQuantity.value = 1
})

// Update when a product is selected
function updateSelectedProduct(code) {
  selectedProduct.value = store.products.find((p) => p.productcode === code)

  if (selectedProduct.value) {
    unitPrice.value = selectedProduct.value.distributorprice
    unitBV.value = selectedProduct.value.bvs
    selectedQuantity.value = 1
  }
}

// Update totals when quantity changes
function updateTotals() {
  if (selectedProduct.value) {
    totalPrice.value = selectedProduct.value.distributorprice * selectedQuantity.value
    totalBV.value = selectedProduct.value.bvs * selectedQuantity.value
  }
}
// Add selected product to salesItems

function addProduct() {
  if (!selectedProduct.value || selectedQuantity.value <= 0) return

  form.items.push({
    productname: selectedProduct.value.productname,
    productcode: selectedProduct.value.productcode,
    unitprice: selectedProduct.value.distributorprice,
    unitbv: selectedProduct.value.bvs,
    quantity: selectedQuantity.value,
  })

  // Reset select and input fields
  selectedProductCode.value = null // Reset q-select to "Select Product"
  selectedProduct.value = null // Clear selected product data
  selectedQuantity.value = 1 // Reset quantity
  unitPrice.value = null // This clears totalPrice because it's reactive
  unitBV.value = null // This clears totalBV
}

// ----------------------------
// Distributor Search (remote + debounced)
// ----------------------------

const fetchDistributors = async (query) => {
  const { data, error } = await supabase
    .from('Distributors')
    .select('DistributorIDNO, DistributorNames')
    .ilike('DistributorNames', `%${query}%`)

  if (error) {
    console.error('Error fetching distributors:', error)
  } else {
    distributors.value = data
  }
}

const validateDistributorIDNO = async () => {
  const id = form.distributoridno.trim()
  if (!id) return

  const { data, error } = await supabase
    .from('Distributors')
    .select('DistributorNames')
    .ilike('DistributorIDNO', id) // case-insensitive
    .single()

  if (error || !data) {
    console.log('Error:', error)
    console.log('Data:', data)
    distributorError.value = 'Distributor ID not found.'
    form.distributoridno = ''
    searchQuery.value = ''
    confirmedDistributor.value = false
  } else {
    distributorError.value = ''
    searchQuery.value = data.DistributorNames
    confirmedDistributor.value = true
  }
}

// Select a distributor from the list
const selectDistributor = (distributor) => {
  searchQuery.value = distributor.DistributorNames
  DistributorIDNO.value = distributor.DistributorIDNO

  // ✅ Sync to store
  form.distributoridno = distributor.DistributorIDNO

  // ✅ Hide suggestions
  confirmedDistributor.value = true
  filteredDistributors.value = []

  // Optional: refocus the input
  document.querySelector('.search-input').focus()
}

const totalReceiptAmount = computed(() => {
  if (!form.items || form.items.length === 0) return 0
  return form.items.reduce((sum, item) => sum + item.unitprice * item.quantity, 0)
})
const totalReceiptBv = computed(() => {
  if (!form.items || form.items.length === 0) return 0
  return form.items.reduce((sum, item) => sum + item.unitbv * item.quantity, 0)
})

//const totalReceiptAmountUSD = computed(() => {
// if (!exchangeRate.value) return 0
//  return (totalReceiptAmount.value * exchangeRate.value).toFixed(0)
//})

// Watch for changes in searchQuery and fetch matching distributors
watchEffect(() => {
  if (searchQuery.value.trim() !== '') {
    fetchDistributors(searchQuery.value)
  } else {
    distributors.value = []
  }
})

// Filter distributors based on searchQuery
watchEffect(() => {
  filteredDistributors.value = distributors.value.filter((distributor) =>
    distributor.DistributorNames.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

// Clear DistributorIDNO if searchQuery is cleared
// Clear DistributorIDNO if searchQuery is cleared

watch(searchQuery, (newVal) => {
  if (!newVal.trim()) {
    DistributorIDNO.value = ''
    distributorError.value = ''
    form.distributoridno = ''
    confirmedDistributor.value = false // 👈 reset confirmation so search works again
  }
})
watch(searchQuery, (newVal) => {
  if (!newVal.trim()) {
    // user cleared the field completely
    confirmedDistributor.value = false
    form.distributoridno = ''
    DistributorIDNO.value = ''
  }
})

// ----------------------------
// Product Select + Add to Cart
// ----------------------------

const validateReceiptNo = async () => {
  // Check sales date first
  if (!form.salesdate) {
    salesDateError.value = $t('selectSalesDate')
    form.receiptno = ''
    return
  } else {
    salesDateError.value = ''
  }

  let receipt = form.receiptno?.trim()
  if (!receipt) return

  // Add prefix if DPC code exists
  if (form.dpccode) {
    receipt = `${form.dpccode}${receipt}`
  }

  // Validate allowed characters
  const isValid = /^[a-zA-Z0-9_-]+$/.test(receipt)
  if (!isValid) {
    $q.notify({
      type: 'negative',
      message: $t('receiptInvalidChars'),
      position: 'top',
    })
    form.receiptno = ''
    return
  }

  // Check if receipt already exists (case-insensitive match)
  const { data: salesMatch } = await supabase
    .from('salesheader')
    .select('distributoridno, datecreated')
    .ilike('receiptno', receipt) // case-insensitive search
    .maybeSingle()

  if (salesMatch) {
    let { distributoridno, datecreated } = salesMatch

    // Normalize DistributorIDNO to uppercase for matching
    const normalizedID = distributoridno.toUpperCase()

    const { data: distributor } = await supabase
      .from('Distributors')
      .select('"DistributorNames"')
      .ilike('"DistributorIDNO"', normalizedID) // case-insensitive match
      .maybeSingle()

    const distName = distributor?.DistributorNames || 'Unknown'

    // Format date according to current locale
    const formattedDate = new Date(datecreated).toLocaleDateString(
      locale.value === 'fr' ? 'fr-FR' : 'en-US',
    )

    $q.notify({
      type: 'negative',
      message: $t('noExists', {
        date: formattedDate,
        client: distName,
        distributorid: distributoridno,
      }),
      timeout: 6500,
      position: 'top',
    })

    form.receiptno = ''
    return
  }

  // Update form with prefixed receipt
  form.receiptno = receipt
}

const submitSale = async () => {
  loading.value = true

  try {
    // ✅ Basic header validation
    if (!form.receiptno || !form.salesdate || !form.distributoridno) {
      $q.notify({
        type: 'negative',
        message: 'Please fill all required header fields.',
        position: 'top',
      })
      return
    }

    // ✅ Ensure at least one product is added
    if (!form.items || form.items.length === 0) {
      $q.notify({
        type: 'negative',
        message: 'You must add at least one product before submitting.',
        position: 'top',
      })
      return
    }

    // 🔹 Enforce prefix on receipt number
    if (form.dpccode && !form.receiptno.startsWith(form.dpccode)) {
      form.receiptno = `${form.dpccode}${form.receiptno}`
    }

    // 🔹 Send to store as-is (no conversion)
    await store.submitSale(form)

    // ✅ Notify success
    $q.notify({
      type: 'positive',
      message: 'Sale submitted successfully!',
      position: 'top',
    })

    // ✅ Reset form after submission, preserve exchangeRate
    const currentRate = form.exchangeRate
    const today = new Date()
    const yyyyToday = today.getFullYear()
    const mmToday = String(today.getMonth() + 1).padStart(2, '0')
    const ddToday = String(today.getDate()).padStart(2, '0')

    Object.assign(form, {
      receiptno: '',
      salesdate: `${yyyyToday}-${mmToday}-${ddToday}`, // reload with today's date
      distributoridno: '',
      createdby: auth.userDetails.firstname,
      lastModifiedby: auth.userDetails.firstname,
      entrysource: 'app',
      entered_by: auth.id,
      items: [],
      exchangeRate: currentRate,
    })

    searchQuery.value = ''
  } catch (err) {
    console.error('Submission error:', err)
    $q.notify({
      type: 'negative',
      message: `Error submitting sale: ${err.message || err}`,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

// ----------------------------
// On Component Mount
// ----------------------------

onMounted(async () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  form.salesdate = `${yyyy}-${mm}-${dd}`
  auth.loadFromLocalStorage()
  store.fetchProducts()
  store.fetchExchangeRate()
  fetchShopName()
  if (['Admin', 'SuperAdmin'].includes(auth.userDetails?.role)) {
    let { data, error } = await supabase.from('dpc').select('dpccode, dpcname')

    if (!error) {
      dpcOptions.value = data.map((d) => ({
        label: d.dpcname,
        value: d.dpccode,
      }))
      // ✅ Preselect user's own DPC if it exists in the list
      form.dpccode = auth.userDetails.dpc_id
    }
  } else if (auth.userDetails?.role === 'User') {
    form.dpccode = auth.userDetails.dpc_id
  }
})
// Computed to check role
const isAdmin = computed(() => ['Admin', 'SuperAdmin'].includes(auth.userDetails?.role))
watch(
  () => auth.userDetails,
  (newVal) => {
    if (newVal) {
      form.dpccode = newVal.dpc_id
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.rounded-borders {
  border-radius: 0.5rem;
}
.hover\:bg-blue-1:hover {
  background-color: #e3f2fd;
}
.search-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.distributor-option {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #ddd;
}

.distributor-option:hover {
  background-color: #f1f1f1;
}
.distributor-container {
  display: flex;
  align-items: center;
  gap: 8px; /* Adds spacing between the name and the GIF */
}
.suggestion-list {
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 4px;
  padding: 8px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  position: absolute;
  width: 100%;
}

.distributor-option {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.distributor-option:hover {
  background-color: #f0f0f0;
}
/* Apply to all outlined inputs/selects inside your form */
.custom-form ::v-deep(.q-field--outlined .q-field__control) {
  border: 2px solid #b6acac !important; /* darker border */
  border-radius: 8px; /* optional: smoother edges */
}

/* Stronger border on hover */
.custom-form ::v-deep(.q-field--outlined:hover .q-field__control) {
  border-color: #111 !important;
}

/* Stronger + colored border when focused */
.custom-form ::v-deep(.q-field--outlined.q-field--focused .q-field__control) {
  border: 2px solid #0d47a1 !important; /* deep blue when focused */
  box-shadow: 0 0 4px rgba(13, 71, 161, 0.5); /* optional glow */
}
.custom-list {
  font-size: 14px; /* default */
  border: 1.5px solid #1b5e20; /* stronger blue border */
  background-color: #f7f3f3; /* light background */
  border-radius: 6px; /* keep rounded look */
}

.custom-list .q-item__label {
  white-space: nowrap; /* ✅ prevent text from wrapping */
  overflow: hidden; /* optional: hide overflow */
  text-overflow: ellipsis; /* optional: show "..." */
}

@media (max-width: 600px) {
  .custom-list {
    font-size: 12px; /* ✅ smaller font on mobile */
  }
}
.custom-list .q-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* adjust based on layout */
}
.product-summary {
  white-space: nowrap;
  overflow-x: auto; /* allow horizontal scroll if too long */
}

@media (max-width: 600px) {
  .product-summary {
    font-size: 0.75rem; /* smaller text on small screens */
  }
  .product-summary span {
    margin-left: 0.25rem; /* reduce space for small screens */
  }
}
.currency-display {
  font-size: 2.2rem; /* bigger and noticeable */
  font-weight: bold;
  display: flex;
  align-items: baseline;
  letter-spacing: 0.5px; /* improves readability */
}

.currency-display .currency {
  font-size: 1.2rem; /* smaller than amount */
  margin-left: 4px; /* space between number and currency */
  opacity: 0.8; /* subtle, not overpowering */
}
.select-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.custom-select {
  width: 100%;
  padding: 8px;
  border: 1px solid white;
  border-radius: 8px;
  color: white;
  text-align: center;
  background-color: #263238; /* matches Quasar bg-blue-grey-10 */
  appearance: none;
  box-sizing: border-box;
  max-width: 100%;
  font-size: 14px;
}

.custom-select option {
  background-color: #263238; /* dropdown list color */
  color: white;
}

.custom-select:focus {
  outline: none;
  border-color: #00bfa5; /* teal focus border */
}
.custom-select {
  background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  padding-right: 32px; /* make room for arrow */
}
</style>
