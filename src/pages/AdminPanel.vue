<template>
  <q-page class="q-pa-sm bg-transparent flex flex-center">
    <q-card
      flat
      bordered
      class="bg-transparent q-pa-sm full-width"
      style="max-width: 900px; width: 100%"
    >
      <!-- Push tabs down & align width -->
      <q-card-section
        class="q-px-none"
        style="
          width: 100%;
          max-width: 900px;
          margin: 75px auto 8px auto; /* top | right | bottom | left */
        "
      >
        <q-tabs
          v-model="tab"
          inline-label
          class="bg-light-green-14 text-white shadow-2 rounded-borders"
        >
          <q-tab name="Dispatch" label="Dispatch" />
          <q-tab v-if="isAdmin || isSuperAdmin" name="Withdraw" label="Withdraw" />

          <q-btn-dropdown auto-close stretch flat label="Reports...">
            <q-list>
              <q-item clickable @click="tab = 'DispatchReport'">
                <q-item-section>Dispatches</q-item-section>
              </q-item>
              <q-item clickable @click="tab = 'withdrawReport'">
                <q-item-section>Withdraws</q-item-section>
              </q-item>
              <q-item v-if="isAdmin || isSuperAdmin" clickable @click="tab = 'StockReport'">
                <q-item-section>Stock Report</q-item-section>
              </q-item>
              <q-item v-if="isAdmin || isSuperAdmin" clickable @click="tab = 'SalesReport'">
                <q-item-section>Sales Report</q-item-section>
              </q-item>
              <q-item v-if="isSuperAdmin" clickable @click="tab = 'Extraction'">
                <q-item-section>Data Extract</q-item-section>
              </q-item>
              <q-item clickable @click="tab = 'Debts'">
                <q-item-section>Debts</q-item-section>
              </q-item>
              <q-item clickable @click="tab = 'Promos'">
                <q-item-section>Promos</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </q-tabs>
      </q-card-section>

      <!-- ================= REPORT SECTION (FULL CENTERED) ================= -->

      <q-card-section class="q-pa-none flex flex-center" style="min-height: 70vh">
        <div style="width: 100%; margin: 0 auto">
          <q-tab-panels
            v-model="tab"
            animated
            transition-next="fade"
            transition-prev="fade"
            class="q-mt-md"
          >
            <!-- Dispatch Tab -->
            <q-tab-panel name="Dispatch" class="q-pa-md transparent-panel full-height">
              <div class="column fit q-gutter-md">
                <div class="text-h6 text-primary text-bold">📦 Dispatch</div>
                <div class="q-pa-md" style="min-height: 70vh; overflow-y: auto">
                  <dispatchForm />
                </div>
              </div>
            </q-tab-panel>

            <!-- Withdraw Tab -->
            <q-tab-panel name="Withdraw" class="q-pa-md transparent-panel full-height">
              <div class="column fit q-gutter-md">
                <div class="row items-center q-gutter-sm text-primary text-bold text-h6">
                  <q-icon name="undo" />
                  <span>Withdraw</span>
                </div>
                <div class="q-pa-md" style="min-height: 70vh; overflow-y: auto">
                  <WithdrawForm />
                </div>
              </div>
            </q-tab-panel>

            <!-- Reports Tab -->
            <q-tab-panel name="StockReport">
              <div class="text-h6">📊 Reports</div>

              <!-- 🔥 RADIO BUTTONS -->
              <div class="row q-gutter-md q-mt-md">
                <q-option-group
                  v-model="displayMode"
                  :options="[
                    { label: 'List View', value: 'list' },
                    { label: 'Table View', value: 'table' },
                    { label: 'Per Shop', value: 'shop' },
                  ]"
                  type="radio"
                  color="primary"
                />
              </div>

              <div class="q-mt-md">
                <stockMonitor v-if="displayMode === 'list'" />
                <stockTable v-else-if="displayMode === 'table'" />
                <shopView v-else-if="displayMode === 'shop'" />
              </div>
            </q-tab-panel>
            <q-tab-panel name="SalesReport">
              <div class="text-h6">📊 Reports</div>

              <!-- 🔥 RADIO BUTTONS -->

              <SalesReport />
            </q-tab-panel>

            <q-tab-panel name="Extraction">
              <div class="text-h6">📊 Admin Only</div>
              <ExxtractionPage />
            </q-tab-panel>
            <q-tab-panel name="DispatchReport">
              <div class="text-h6">📊 DispatchReport</div>
              <dispatchReport />
            </q-tab-panel>
            <q-tab-panel name="withdrawReport">
              <div class="text-h6">📊 Withdraws</div>
              <WithdrawReport />
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

//import { supabase } from 'boot/supabase'
import { useAuth } from 'stores/auth'
import dispatchForm from '../components/dispatchForm.vue'
import WithdrawForm from 'src/components/withdrawForm.vue'
import stockMonitor from 'src/components/stockMonitor.vue'
import stockTable from 'src/components/stockTable.vue'
import shopView from 'src/components/shopView.vue'
import ExxtractionPage from 'src/components/ExxtractionPage.vue'
import dispatchReport from 'src/components/dispatchReport.vue'
import WithdrawReport from 'src/components/WithdrawReport.vue'
import SalesReport from 'src/components/salesReport.vue'
const auth = useAuth()
const currentDate = ref('')
const tab = ref('Dispatch')
const isAdmin = computed(() => auth.userDetails?.role === 'Admin')
const isSuperAdmin = computed(() => auth.userDetails?.role === 'SuperAdmin')
const displayMode = ref('list') // 'list' or 'table'

function getCurrentDate() {
  const today = new Date()
  const options = { year: 'numeric', month: 'short', day: 'numeric' } // Example: "Oct 30, 2025"
  currentDate.value = today.toLocaleDateString(undefined, options)
}
// Call on mount
onMounted(() => {
  getCurrentDate()
})
</script>
<style scoped>
/* Desktop default */
.responsive-tabs .q-tab__label {
  font-size: 14px;
}
.responsive-tabs .q-tab__icon {
  font-size: 22px;
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .responsive-tabs {
    width: 100%; /* stretch across the page */
  }
  .responsive-tabs .q-tab {
    min-width: auto; /* allow tabs to shrink */
    padding: 4px 8px; /* smaller padding */
    flex-shrink: 1; /* let tab shrink to avoid wrapping */
  }
  .responsive-tabs .q-tab__label {
    font-size: 11px; /* smaller labels */
  }
  .responsive-tabs .q-tab__icon {
    font-size: 16px; /* smaller icons */
    margin-right: 4px; /* space between icon and label */
  }
}

.info-bar {
  width: 100%;
  flex-wrap: nowrap; /* prevent wrapping */
  gap: 16px; /* space between items */
  font-size: 14px;
}

@media (max-width: 600px) {
  .info-bar {
    gap: 8px; /* slightly tighter spacing for small screens */
    font-size: 12px; /* smaller text for mobile */
  }
}
.transparent-panel {
  background-color: transparent !important;
  box-shadow: none !important;
}
</style>
