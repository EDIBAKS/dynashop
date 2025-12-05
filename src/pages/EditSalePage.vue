<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md" style="max-width: 800px; margin: auto; position: relative">
      <!-- HEADER -->
      <q-card-section>
        <div class="text-h6">Edit Sale</div>
        <div class="q-mt-sm">
          <q-input v-model="form.distributoridno" label="Distributor ID" dense outlined />
        </div>
        <div class="q-mt-sm">
          <DistributorSearch v-model="form.distributoridno" v-model:name="form.distributorname" />
        </div>
        <div class="q-mt-sm row q-col-gutter-sm">
          <div class="col">
            <q-select
              v-model="form.dpccode"
              :options="dpcs"
              option-value="dpccode"
              option-label="dpcname"
              label="DPC"
              dense
              outlined
              emit-value
              map-options
            />
          </div>
          <div class="col">
            <q-input v-model="form.salesdate" label="Sales Date" type="date" dense outlined />
          </div>
        </div>
      </q-card-section>

      <!-- PRODUCT LIST -->
      <q-card-section>
        <div
          v-for="(item, index) in form.salesdetails"
          :key="item.productcode + '_' + index"
          class="q-mb-sm row q-col-gutter-sm items-center q-gutter-xs"
        >
          <!-- Product name / select wraps above on mobile -->
          <div class="col-12 col-sm-4">
            <q-select
              v-model="item.productcode"
              :options="products"
              option-value="productcode"
              option-label="productname"
              label="Product"
              dense
              outlined
              emit-value
              map-options
              @update:model-value="() => selectProduct(item)"
              :disable="item.isExisting"
            />
          </div>

          <!-- Other inputs: qty, price, BV + delete button -->
          <div class="col-12 col-sm row items-center no-wrap q-gutter-sm">
            <q-input
              v-model.number="item.quantity"
              type="number"
              label="Qty"
              dense
              outlined
              :disable="item.availableQty === 0"
              @update:model-value="() => changeQuantity(item)"
              class="col"
            />
            <q-input
              v-model.number="item.unitprice"
              type="number"
              label="Price"
              dense
              outlined
              readonly
              class="col"
            />
            <q-input
              v-model.number="item.unitbv"
              type="number"
              label="BV"
              dense
              outlined
              readonly
              class="col"
            />
            <q-btn dense flat color="negative" icon="delete" @click="removeProduct(index, item)" />
          </div>

          <!-- Available qty -->
          <div class="col-12 text-caption">Available: {{ item.availableQty }}</div>
        </div>
      </q-card-section>
      <q-card-section>
        <!-- FLOATING ADD ITEM BUTTON -->
        <q-btn
          fab
          color="green"
          icon="add"
          class="absolute-bottom-right q-mb-md q-mr-md"
          @click="addProduct"
        />
      </q-card-section>

      <!-- FOOTER ACTIONS -->
      <q-card-actions align="right">
        <q-spinner-hourglass v-if="loading" color="primary" size="30px" />
        <q-btn flat label="Cancel" @click="$router.back()" />
        <q-btn color="primary" label="Save" @click="submitUpdate" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
import DistributorSearch from 'components/DistributorSearch.vue'
//import { useAuthStore } from 'stores/auth'
//const storeAuth = useAuthStore()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const loading = ref(false)
const products = ref([])
const dpcs = ref([])

const form = ref({
  receiptno: '',
  distributoridno: '',
  distributorname: '',
  dpccode: '',
  salesdate: '',
  salesdetails: [], // productcode, quantity, unitprice, unitbv, availableQty, isExisting
})

// snapshot of original items (used to compute diffs)
const originalItems = ref([])

/* ------------------------- Load Receipt ------------------------- */
async function fetchReceipt(receiptno) {
  try {
    // Fetch sales header
    const { data: header, error: headerErr } = await supabase
      .from('salesheader')
      .select('*')
      .eq('receiptno', receiptno)
      .maybeSingle()
    if (headerErr) throw headerErr

    // Fetch sales details
    const { data: details, error: detailsErr } = await supabase
      .from('salesdetails')
      .select('*')
      .eq('receiptno', receiptno)
    if (detailsErr) throw detailsErr

    // Map details and mark existing products
    const mappedDetails = (details || []).map((d) => ({
      productcode: d.productcode,
      quantity: d.quantity,
      unitprice: d.unitprice ?? 0,
      unitbv: d.unitbv ?? 0,
      availableQty: 0, // will be loaded separately
      isExisting: true, // existing products are unchangeable
    }))

    // Populate form reactive object
    // NOTE: for distributorname we prefer header value but fall back to any existing edited value
    form.value = {
      receiptno: header?.receiptno || receiptno,
      distributoridno: header?.distributoridno || form.value.distributoridno || '',
      distributorname: (header?.distributorname ?? form.value.distributorname) || '',
      dpccode: header?.dpccode || form.value.dpccode || '',
      salesdate: header?.salesdate ? header.salesdate.split('T')[0] : form.value.salesdate || '',
      salesdetails: mappedDetails,
    }

    // Keep a snapshot of original items for diffing
    originalItems.value = JSON.parse(JSON.stringify(mappedDetails))

    // Load available stock for each item concurrently
    await Promise.all(form.value.salesdetails.map((item) => loadStock(item)))
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Failed to load receipt' })
  }
}

/* ------------------------- Stock utilities ------------------------- */
async function loadStock(item) {
  if (!form.value.dpccode || !item.productcode) {
    item.availableQty = 0
    return
  }
  const stockTable = `${form.value.dpccode}_STOCK`
  const { data } = await supabase
    .from(stockTable)
    .select('quantity')
    .eq('productcode', item.productcode)
    .maybeSingle()
  item.availableQty = data?.quantity ?? 0
}

/* ------------------------- Product selection ------------------------- */
async function selectProduct(item) {
  const p = products.value.find((x) => x.productcode === item.productcode)
  if (!p) return
  item.unitprice = p.distributorprice ?? 0
  item.unitbv = p.bvs ?? 0
  // IMPORTANT: do NOT force-set item.quantity here (avoids double deductions)
  await loadStock(item)
}

/* ------------------------- Quantity changes ------------------------- */
async function changeQuantity(item) {
  if (!item.quantity || item.quantity < 1) item.quantity = 1
  if (item.quantity > item.availableQty) {
    item.quantity = item.availableQty
    $q.notify({ type: 'warning', message: `Only ${item.availableQty} available` })
  }
}

/* ------------------------- Add/Remove ------------------------- */
function addProduct() {
  form.value.salesdetails.push({
    productcode: '',
    quantity: 1, // new rows start with 1
    unitprice: 0,
    unitbv: 0,
    availableQty: 0,
    isExisting: false, // allow editing the product on new rows
  })
}

function removeProduct(index, item) {
  $q.dialog({
    title: 'Confirm Removal',
    message: `Remove ${item.productname || item.productcode || 'this product'}?`,
    ok: { label: 'Yes', color: 'negative' },
    cancel: { label: 'Cancel', color: 'grey' },
    persistent: true,
  }).onOk(() => {
    // JUST remove from array (do NOT update stock)
    form.value.salesdetails.splice(index, 1)

    $q.notify({
      type: 'positive',
      message: 'Product removed',
    })
  })
}

/* ------------------------- Compute diffs ------------------------- */
const getInserts = () =>
  form.value.salesdetails.filter(
    (it) => !originalItems.value.some((o) => o.productcode === it.productcode),
  )
const getUpdates = () =>
  form.value.salesdetails.filter((it) => {
    const o = originalItems.value.find((x) => x.productcode === it.productcode)
    return o && o.quantity !== it.quantity
  })
const getDeletes = () =>
  originalItems.value.filter(
    (o) => !form.value.salesdetails.some((it) => it.productcode === o.productcode),
  )

/* ------------------------- Submit Update ------------------------- */
async function submitUpdate() {
  if (!form.value.dpccode) {
    $q.notify({ type: 'negative', message: 'DPC required!' })
    return
  }
  loading.value = true
  const stockTable = `${form.value.dpccode}_STOCK`

  try {
    const inserts = getInserts()
    const updates = getUpdates()
    const deletes = getDeletes()

    // 1) Handle deletes: restore stock and remove from salesdetails table
    for (const oldItem of deletes) {
      const { data } = await supabase
        .from(stockTable)
        .select('quantity')
        .eq('productcode', oldItem.productcode)
        .maybeSingle()
      const newStock = (data?.quantity ?? 0) + (oldItem.quantity ?? 0)
      await supabase
        .from(stockTable)
        .update({ quantity: newStock, lastmodified: new Date(), modifiedby: 'system' })
        .eq('productcode', oldItem.productcode)

      await supabase
        .from('salesdetails')
        .delete()
        .eq('receiptno', form.value.receiptno)
        .eq('productcode', oldItem.productcode)
    }

    // If user removed all products -> delete entire receipt (header + details) and exit
    if (form.value.salesdetails.length === 0) {
      await supabase.from('salesheader').delete().eq('receiptno', form.value.receiptno)
      await supabase.from('salesdetails').delete().eq('receiptno', form.value.receiptno)
      $q.notify({ type: 'positive', message: 'All products removed — receipt deleted.' })
      router.back()
      return
    }

    // 2) Handle updates: adjust stock by the difference and update salesdetails rows
    for (const newItem of updates) {
      const original = originalItems.value.find((o) => o.productcode === newItem.productcode)
      const diff = (original?.quantity ?? 0) - newItem.quantity
      const { data } = await supabase
        .from(stockTable)
        .select('quantity')
        .eq('productcode', newItem.productcode)
        .maybeSingle()
      const updatedStock = (data?.quantity ?? 0) + diff
      await supabase
        .from(stockTable)
        .update({ quantity: updatedStock, lastmodified: new Date(), modifiedby: 'system' })
        .eq('productcode', newItem.productcode)

      await supabase
        .from('salesdetails')
        .update({
          quantity: newItem.quantity,
          unitprice: newItem.unitprice,
          unitbv: newItem.unitbv,
        })
        .eq('receiptno', form.value.receiptno)
        .eq('productcode', newItem.productcode)
    }

    // 3) Handle inserts: deduct stock and insert new salesdetails rows
    if (inserts.length) {
      const payload = []
      for (const i of inserts) {
        const { data } = await supabase
          .from(stockTable)
          .select('quantity')
          .eq('productcode', i.productcode)
          .maybeSingle()
        const newStock = (data?.quantity ?? 0) - (i.quantity ?? 0)
        await supabase
          .from(stockTable)
          .update({ quantity: newStock, lastmodified: new Date(), modifiedby: 'system' })
          .eq('productcode', i.productcode)

        payload.push({
          receiptno: form.value.receiptno,
          productcode: i.productcode,
          quantity: i.quantity,
          unitprice: i.unitprice,
          unitbv: i.unitbv,
        })
      }
      await supabase.from('salesdetails').insert(payload)
    }

    // 4) Always update salesheader (allows editing name/salesdate even if products unchanged)
    // Update salesheader
    await supabase
      .from('salesheader')
      .update({
        distributoridno: form.value.distributoridno, // EDITABLE
        dpccode: form.value.dpccode,
        salesdate: form.value.salesdate, // EDITABLE
        lastmodified: new Date(),
        lastmodifiedby: 'system',
      })
      .eq('receiptno', form.value.receiptno)

    $q.notify({ type: 'positive', message: 'Receipt and stock updated!' })

    // Refresh the receipt to get the latest state (but keep any edited distributorname if missing)
    await fetchReceipt(form.value.receiptno)
    router.back()
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Update failed!' })
  } finally {
    loading.value = false
  }
}

/* ------------------------- Lifecycle ------------------------- */
onMounted(async () => {
  const { data: d } = await supabase.from('dpc').select('dpccode, dpcname').order('dpcname')
  dpcs.value = d || []

  const { data: p } = await supabase
    .from('products')
    .select('productcode, productname, distributorprice, bvs')
    .eq('status', 'active')
  products.value = p || []

  const receiptno = route.params.receiptno
  if (receiptno) await fetchReceipt(receiptno)
})

watch(
  () => form.value.dpccode,
  async () => {
    // reload stock after DPC change
    await Promise.all(form.value.salesdetails.map((it) => loadStock(it)))
  },
)
</script>
