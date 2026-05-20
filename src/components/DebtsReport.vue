<template>
  <q-page class="q-pa-md">
    <q-card flat class="q-pa-md" style="max-width: 1200px; margin: 0 auto">
      <!-- HEADER -->
      <div class="text-h6 text-bold text-primary q-mb-md">Debts Report</div>

      <!-- DATE FILTERS -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col">
          <q-input v-model="startDate" type="date" label="Start Date" dense outlined />
        </div>

        <div class="col">
          <q-input v-model="endDate" type="date" label="End Date" dense outlined />
        </div>

        <div class="col-auto flex flex-center">
          <q-btn color="primary" label="Refresh" @click="fetchDebts" />
        </div>
      </div>

      <!-- GROUPED DEBTS -->
      <div v-if="debtsByGroup.length">
        <div v-for="group in debtsByGroup" :key="group.key" class="q-mb-lg">
          <!-- GROUP HEADER -->
          <div class="bg-primary text-white q-pa-sm rounded-borders">
            <div class="text-bold">Shop: {{ group.shopcode }}</div>

            <div class="text-caption">Date: {{ group.date }}</div>
          </div>

          <!-- LIST -->
          <q-list bordered separator class="bg-grey-1">
            <q-item v-for="row in group.rows" :key="row.id">
              <q-item-section>
                <div class="text-subtitle2 text-bold">
                  {{ row.productcode }} - {{ row.productname }}
                </div>

                <div class="row items-center q-gutter-sm q-mt-xs">
                  <q-avatar size="35px" class="bg-black text-white">
                    {{ row.quantity }}
                  </q-avatar>

                  <div class="text-caption">Qty Owed</div>
                </div>

                <div class="text-caption q-mt-xs">
                  Distributor:
                  {{ row.distributorname }}
                </div>

                <div class="text-caption">
                  Added By:
                  {{ row.addedby }}
                </div>
              </q-item-section>

              <!-- PAY DEBT -->
              <q-item-section side top>
                <q-btn
                  color="green"
                  icon="payments"
                  label="Pay Debt"
                  dense
                  :loading="loading"
                  @click="confirmDebtClear(row)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>

      <!-- EMPTY -->
      <div v-else class="text-center text-grey q-mt-xl">No debts found.</div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const debts = ref([])
const loading = ref(false)
const productsMap = ref({})

const startDate = ref(new Date().toISOString().split('T')[0])

const endDate = ref(new Date().toISOString().split('T')[0])

// FETCH PRODUCTS
async function fetchProducts() {
  const { data, error } = await supabase.from('products').select('productcode, productname')

  if (!error) {
    productsMap.value = data.reduce((acc, p) => {
      acc[p.productcode] = p
      return acc
    }, {})
  }
}

// FETCH DEBTS
async function fetchDebts() {
  loading.value = true

  try {
    let query = supabase
      .from('debts')
      .select('*')
      .order('date', { ascending: false })
      .order('shopcode', { ascending: true })

    if (startDate.value) {
      query = query.gte('date', startDate.value)
    }

    if (endDate.value) {
      query = query.lte('date', endDate.value)
    }

    const { data, error } = await query

    if (error) throw error

    debts.value = data.map((d) => ({
      ...d,
      productname: productsMap.value[d.productcode]?.productname || d.productcode,
    }))
  } catch (err) {
    console.error(err)

    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to fetch debts',
    })
  } finally {
    loading.value = false
  }
}

// GROUP BY SHOP + DATE
const debtsByGroup = computed(() => {
  const grouped = {}

  debts.value.forEach((d) => {
    const key = `${d.shopcode}_${d.date}`

    if (!grouped[key]) {
      grouped[key] = {
        key,
        shopcode: d.shopcode,
        date: d.date,
        rows: [],
      }
    }

    grouped[key].rows.push(d)
  })

  return Object.values(grouped)
})

// CONFIRM
function confirmDebtClear(row) {
  $q.dialog({
    title: 'Confirm Debt Payment',
    message: `
      Return ${row.quantity} × ${row.productname}
      back to stock and remove this debt?
    `,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    processDebtClear(row)
  })
}

// PROCESS
async function processDebtClear(row) {
  const dismiss = $q.notify({
    spinner: true,
    timeout: 0,
    color: 'info',
    message: 'Processing debt payment...',
  })

  try {
    const { error } = await supabase.rpc('clear_debt_and_return_stock', {
      p_debt_id: row.id,
      p_shopcode: row.shopcode,
      p_productcode: row.productcode,
      p_quantity: Number(row.quantity),
    })

    if (error) throw error

    // REMOVE FROM UI
    debts.value = debts.value.filter((d) => d.id !== row.id)

    dismiss()

    $q.notify({
      type: 'positive',
      timeout: 7000,
      message: 'Debt paid successfully. Please go to Sales and make a receipt for the paid debt.',
    })
  } catch (err) {
    dismiss()

    console.error(err)

    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to process debt payment.',
    })
  }
}

// LOAD
onMounted(async () => {
  await fetchProducts()
  await fetchDebts()
})
</script>
