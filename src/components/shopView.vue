<template>
  <q-card flat bordered class="q-pa-md">
    <!-- DPC SELECT -->
    <div class="q-mb-md">
      <select
        v-if="isAdmin"
        v-model="form.dpccode"
        class="custom-select full-width text-center bg-blue-grey-10"
      >
        <option v-for="option in dpcOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <q-input
        v-else
        v-model="form.dpccode"
        label="DPC Code"
        dense
        outlined
        readonly
        class="full-width"
        input-class="text-center text-bold text-white"
      />
    </div>

    <!-- DATE RANGE -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6">
        <div class="text-caption text-bold q-mb-xs">{{ $t('startDate') }}</div>
        <q-input v-model="form.startDate" type="date" dense outlined class="full-width" />
      </div>

      <div class="col-12 col-sm-6">
        <div class="text-caption text-bold q-mb-xs">{{ $t('endDate') }}</div>
        <q-input v-model="form.endDate" type="date" dense outlined class="full-width" />
      </div>
    </div>

    <!-- GENERATE BUTTON -->
    <q-btn
      label="Generate Stock Report"
      color="primary"
      class="full-width q-mb-md"
      @click="fetchStock"
    />

    <!-- EXPORT -->
    <reportExporter v-if="reportData.length" reportType="stock" :reportData="reportData" />

    <!-- REPORT HEADER -->
    <q-card-section v-if="reportData.length" class="bg-grey-2 q-pa-sm">
      <div class="row justify-between">
        <div>
          <div><strong>DPC:</strong> {{ shopName }}</div>
        </div>
        <div class="text-right">
          <div><strong>Date:</strong> {{ currentDate }}</div>
          <div><strong>User:</strong> {{ auth.userDetails?.firstname }}</div>
        </div>
      </div>
    </q-card-section>

    <!-- EMPTY -->
    <div v-if="!stock.length" class="text-center text-red q-mt-md">No stock found.</div>

    <!-- FILTERS -->
    <q-card-section v-if="stock.length">
      <q-option-group v-model="stockFilter" :options="filterOptions" inline type="radio" />
    </q-card-section>

    <!-- TABLE -->
    <q-table
      v-if="stock.length"
      title="Stock Summary"
      :rows="filteredStock"
      :columns="columns"
      row-key="productcode"
      flat
      bordered
      dense
      separator="cell"
      :pagination="{ rowsPerPage: 0 }"
    >
      <template #body-cell-quantity="props">
        <q-td :props="props" :class="rowColor(props.row.quantity)">
          {{ props.row.quantity }}
        </q-td>
      </template>

      <template #bottom-row>
        <q-tr>
          <q-td colspan="3" class="text-right text-bold"> Totals: </q-td>
          <q-td class="text-bold">
            {{ stockTotals.totalDpValue.toFixed(2) }}
          </q-td>
          <q-td class="text-bold">
            {{ stockTotals.totalBvValue.toFixed(2) }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-card>
</template>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from 'stores/auth'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'
import reportExporter from 'src/components/ExporterComponent.vue'

const auth = useAuth()
const $q = useQuasar()

/* ---------------- STATE ---------------- */
const stock = ref([])
const dpcOptions = ref([])
const stockFilter = ref('all')

const stockTotals = ref({
  totalDpValue: 0,
  totalBvValue: 0,
})

const form = reactive({
  startDate: '',
  endDate: '',
  dpccode: '',
})

/* ---------------- COMPUTED ---------------- */
const isAdmin = computed(() => ['Admin', 'SuperAdmin'].includes(auth.userDetails?.role))

const reportData = computed(() => stock.value || [])

const filteredStock = computed(() => {
  if (!Array.isArray(stock.value)) return []

  if (stockFilter.value === 'above20') return stock.value.filter((s) => s.quantity > 20)

  if (stockFilter.value === 'below5') return stock.value.filter((s) => s.quantity < 5)

  return stock.value
})

const shopName = computed(() => {
  const found = dpcOptions.value.find((d) => d.value === form.dpccode)
  return found?.label || ''
})

const currentDate = computed(() => new Date().toLocaleDateString())

/* ---------------- TABLE CONFIG ---------------- */
const columns = [
  { name: 'productcode', label: 'Code', field: 'productcode' },
  { name: 'productname', label: 'Product', field: 'productname' },
  { name: 'quantity', label: 'Qty', field: 'quantity', align: 'right' },
  { name: 'dpValue', label: 'DP Value', field: 'dpValue', align: 'right' },
  { name: 'bvValue', label: 'BV Value', field: 'bvValue', align: 'right' },
]

const filterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Above 20', value: 'above20' },
  { label: 'Below 5', value: 'below5' },
]

/* ---------------- METHODS ---------------- */
function rowColor(qty) {
  if (qty < 5) return 'bg-red-2'
  if (qty > 20) return 'bg-green-2'
  return ''
}

async function fetchStock() {
  if (!form.dpccode) {
    $q.notify({ type: 'negative', message: 'No DPC selected' })
    return
  }

  const tableName = `${form.dpccode}_STOCK`

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('productcode, productname, quantity')

    if (error) throw error

    stock.value = (data || []).map((i) => ({
      ...i,
      quantity: Number(i.quantity) || 0,
      dpValue: 0,
      bvValue: 0,
    }))
  } catch (err) {
    console.error(err)
    stock.value = []
  }
}

/* ---------------- INIT ---------------- */
onMounted(async () => {
  if (isAdmin.value) {
    const { data } = await supabase.from('shops').select('shopcode, shop_name').order('shop_name')

    dpcOptions.value = (data || []).map((d) => ({
      label: d.shop_name,
      value: d.shopcode,
    }))

    form.dpccode = dpcOptions.value[0]?.value || ''
  } else {
    form.dpccode = auth.userDetails?.dpc_id
  }
})
</script>

<style></style>
