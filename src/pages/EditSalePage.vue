<template>
  <q-page class="q-pa-md">
    <q-card style="max-width: 600px; margin: auto">
      <q-card-section>
        <div class="text-h6">
          Edit Sale
          <div class="text-green-14 text-subtitle2">
            {{ form.receiptno }}
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <q-input v-model="form.distributoridno" label="Distributor ID" dense outlined />
        <!-- Distributor Search -->
        <div class="q-mb-sm">
          <!-- Distributor Search -->
          <DistributorSearch v-model="form.distributoridno" />

          <!-- Debug -->
          <div class="q-mt-md">Selected ID: {{ form.distributoridno }}</div>
        </div>

        <ul v-if="filteredDistributors.length && searchQuery.trim() !== ''" class="suggestion-list">
          <li
            v-for="dist in filteredDistributors"
            :key="dist.DistributorIDNO"
            @click="selectDistributor(dist)"
            class="distributor-option"
          >
            {{ dist.DistributorNames }}
          </li>
        </ul>
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
          class="q-mt-md"
        />
        <q-input
          v-model="form.salesdate"
          label="Sales Date"
          type="date"
          dense
          outlined
          class="q-mt-md"
        />

        <div class="q-mt-md">
          <div
            v-for="(item, i) in form.salesdetails"
            :key="i"
            class="row q-mb-sm items-start q-gutter-xs"
          >
            <!-- Product Select -->
            <q-select
              v-model="item.productcode"
              :options="products"
              option-value="productcode"
              option-label="productname"
              emit-value
              map-options
              label="Product"
              dense
              outlined
              class="col-12 col-sm-5 text-truncate"
              style="min-width: 0"
              @update:model-value="updateProductDetails(item)"
            />

            <!-- Qty -->
            <q-input
              v-model.number="item.quantity"
              type="number"
              label="Qty"
              dense
              outlined
              class="col-4 col-sm-2 text-center"
              @update:model-value="recalcItem(item)"
            />

            <!-- Price -->
            <q-input
              v-model.number="item.unitprice"
              type="number"
              label="Price"
              dense
              outlined
              readonly
              class="col-4 col-sm-2 text-center"
            />

            <!-- BV -->
            <q-input
              v-model.number="item.unitbv"
              type="number"
              label="BV"
              dense
              outlined
              readonly
              class="col-4 col-sm-2 text-center"
            />

            <!-- Buttons Row (stacks below on mobile) -->
            <div class="col-12 flex justify-center q-mt-xs">
              <q-btn
                dense
                flat
                round
                color="primary"
                icon="save"
                size="sm"
                class="q-mx-xs"
                @click="markProductForSave(item)"
              />
              <q-btn
                dense
                flat
                round
                color="negative"
                icon="delete"
                size="sm"
                class="q-mx-xs"
                @click="removeProduct(i, item)"
              />
            </div>
          </div>

          <!-- Add New Product -->
          <q-btn color="green" label="Add Product" flat @click="addProduct" />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" @click="$router.back()" />
        <q-btn color="primary" label="Save" @click="submitUpdate" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSaleStore } from '../stores/storeSales' // adjust path to your file
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
import DistributorSearch from 'components/DistributorSearch.vue'
import { useI18n } from 'vue-i18n'
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const changedItems = ref([])
const deletedItems = ref([])

const salesStore = useSaleStore()

const form = ref({
  receiptno: '',
  distributoridno: '',
  dpccode: '',
  salesdate: '',
  salesdetails: [],
})
const products = ref([]) // active product list
const searchQuery = ref('')
const distributors = ref([])
const dpcs = ref([])

const filteredDistributors = computed(() =>
  distributors.value.filter((d) =>
    d.DistributorNames.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
)

const selectDistributor = (dist) => {
  form.value.distributoridno = dist.DistributorIDNO
  searchQuery.value = dist.DistributorNames
}
// mark an item for saving (insert or update later)
const markProductForSave = (item) => {
  // attach receiptno if new
  item.receiptno = form.value.receiptno

  // if not already marked, push into changedItems
  const exists = changedItems.value.find((ci) => ci.productcode === item.productcode)
  if (!exists) {
    changedItems.value.push({ ...item })
  } else {
    // replace with latest values
    Object.assign(exists, item)
  }

  $q.notify({ type: 'info', message: `Marked ${item.productcode} for save` })
}

const removeProduct = (i, item) => {
  $q.dialog({
    title: 'Confirm Removal',
    message: `Are you sure you want to remove product ${item.productcode}?`,
    ok: {
      label: 'Yes, remove',
      color: 'negative',
    },
    cancel: {
      label: 'Cancel',
      color: 'grey',
    },
    persistent: true,
  }).onOk(() => {
    // Mark this product for DB deletion
    deletedItems.value.push(item)

    // Remove from local list
    form.value.salesdetails.splice(i, 1)

    // If no items remain, confirm deleting the whole receipt
    if (form.value.salesdetails.length === 0) {
      $q.dialog({
        title: $t('deleteReceipt.title'),
        message: $t('deleteReceipt.message'),
        ok: {
          label: $t('deleteReceipt.ok'),
          color: 'negative',
        },
        cancel: {
          label: $t('deleteReceipt.cancel'),
          color: 'grey',
        },
        persistent: true,
      }).onOk(() => {
        deleteEntireReceipt()
      })
    }
  })
}
const deleteEntireReceipt = async () => {
  try {
    const { error: delDetailsError } = await supabase
      .from('salesdetails')
      .delete()
      .eq('receiptno', form.value.receiptno)

    if (delDetailsError) throw delDetailsError

    const { error: delHeaderError } = await supabase
      .from('salesheader')
      .delete()
      .eq('receiptno', form.value.receiptno)

    if (delHeaderError) throw delHeaderError

    $q.notify({ type: 'positive', message: 'Sale deleted (no products left).' })
    router.back()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message || 'Deletion failed' })
  }
}
onMounted(async () => {
  const { data } = await supabase.from('Distributors').select('DistributorIDNO, DistributorNames')
  distributors.value = data || []
})

onMounted(async () => {
  const receiptno = route.params.receiptno
  if (!receiptno) return

  // Fetch sale by receiptno
  await salesStore.fetchSaleByReceipt(receiptno)
  const sale = salesStore.selectedSale
  if (sale) {
    form.value = JSON.parse(JSON.stringify(sale)) // clone
  }

  // Fetch active products
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('productcode, productname, distributorprice, bvs')
    .eq('status', 'active')

  if (!productsError) products.value = productsData

  // Fetch all DPCs
  const { data: dpcData, error: dpcError } = await supabase
    .from('dpc')
    .select('dpccode, dpcname')
    .order('dpcname')

  if (!dpcError && dpcData) {
    dpcs.value = dpcData
  }

  // Preselect the sale's current DPC (if editing existing sale)
  if (sale && sale.dpccode) {
    form.value.dpccode = sale.dpccode
  }
})

// Add a new blank product line
const addProduct = () => {
  form.value.salesdetails.push({
    productcode: '',
    unitprice: 0,
    unitbv: 0,
    quantity: 1,
  })
}

// Remove product row (with confirm + delete in DB)

// Update price + BV when product selected
const updateProductDetails = (item) => {
  const product = products.value.find((p) => p.productcode === item.productcode)
  if (product) {
    item.unitprice = product.distributorprice
    item.unitbv = product.bvs
    item.quantity = 1
  }
}

// Recalculate totals when qty changes (optional if you need line totals later)
const recalcItem = () => {
  // right now nothing to do, unless BV or price changes dynamically
}

const submitUpdate = async () => {
  try {
    if (form.value.salesdetails.length === 0) {
      // No products left -> delete entire receipt
      const { error: delDetailsError } = await supabase
        .from('salesdetails')
        .delete()
        .eq('receiptno', form.value.receiptno)

      if (delDetailsError) throw delDetailsError

      const { error: delHeaderError } = await supabase
        .from('salesheader')
        .delete()
        .eq('receiptno', form.value.receiptno)

      if (delHeaderError) throw delHeaderError

      $q.notify({ type: 'positive', message: 'Sale deleted (no products left).' })
      router.back()
      return
    }

    // Otherwise update as normal
    await salesStore.updateReceipt({
      header: {
        receiptno: form.value.receiptno,
        distributoridno: form.value.distributoridno,
        dpccode: form.value.dpccode,
        salesdate: form.value.salesdate,
      },
      deletedItems: deletedItems.value,
      changedItems: changedItems.value,
    })

    $q.notify({ type: 'positive', message: 'Sale updated!' })
    router.back()
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message || 'Update failed' })
  }
}
</script>
