<template>
  <q-page class="q-pa-md">
    <q-card flat bordered class="q-pa-md">
      <!-- 🔍 Reusable Distributor Search -->
      <DistributorSearch v-model="form.distributoridno" v-model:name="form.distributorname" />

      <!-- Selected ID (optional display) -->
      <q-input
        v-model="form.distributoridno"
        label="Distributor ID"
        dense
        outlined
        readonly
        class="q-mt-sm"
      />

      <!-- Date Range -->
      <div class="row q-col-gutter-sm q-mt-sm">
        <div class="col-6">
          <q-input v-model="form.date_from" type="date" label="From" dense outlined />
        </div>
        <div class="col-6">
          <q-input v-model="form.date_to" type="date" label="To" dense outlined />
        </div>
      </div>

      <!-- Action -->
      <q-btn
        label="View Group BV"
        color="primary"
        class="full-width q-mt-md"
        :loading="loading"
        @click="fetchLegs"
      />
      <q-btn
        label="Export to PDF"
        color="red"
        icon="picture_as_pdf"
        class="full-width q-mt-sm"
        :disable="!legs.length"
        @click="exportToPDF"
      />
    </q-card>

    <!-- Results -->
    <q-card v-if="legs.length" flat bordered class="q-pa-md q-mt-md">
      <div class="text-subtitle1 text-bold q-mb-sm">Direct Legs</div>

      <q-list separator>
        <q-item v-for="leg in legs" :key="leg.leg_distributoridno">
          <q-item-section>
            <div class="text-bold">{{ leg.distributorname }}</div>
            <div class="text-caption text-grey">
              {{ leg.leg_distributoridno }} • {{ leg.distributorposition }}
            </div>
          </q-item-section>

          <q-item-section side>
            <div class="text-bold text-green-14">
              Personal BV: {{ (leg.personal_bv ?? 0).toLocaleString() }}
            </div>
            <div class="text-bold text-blue">
              Group BV: {{ (leg.group_bv ?? 0).toLocaleString() }}
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import DistributorSearch from 'components/DistributorSearch.vue'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const $q = useQuasar()

const form = ref({
  distributoridno: '',
  distributorname: '',
  date_from: '',
  date_to: '',
})

const legs = ref([])
const loading = ref(false)

/* 📊 Fetch legs BV */
const fetchLegs = async () => {
  if (!form.value.distributoridno || !form.value.date_from || !form.value.date_to) {
    $q.notify({
      type: 'negative',
      message: 'Please select distributor and date range',
    })
    return
  }

  loading.value = true
  legs.value = []

  const { data, error } = await supabase.rpc('sp_manager_legs', {
    p_dno: form.value.distributoridno,
    p_date_from: form.value.date_from,
    p_date_to: form.value.date_to,
  })

  loading.value = false

  if (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Failed to load data' })
  } else {
    // ✅ Sort by group_bv descending
    legs.value = (data || []).sort((a, b) => (b.group_bv ?? 0) - (a.group_bv ?? 0))
  }
}
const exportToPDF = () => {
  const doc = new jsPDF('p', 'mm', 'a4')

  // Title
  doc.setFontSize(14)
  doc.text('Group BV Report', 14, 15)

  // Sub-header
  doc.setFontSize(10)
  doc.text(`Distributor: ${form.value.distributorname}`, 14, 22)
  doc.text(`Distributor ID: ${form.value.distributoridno}`, 14, 27)
  doc.text(`Period: ${form.value.date_from} to ${form.value.date_to}`, 14, 32)

  // Table data
  const tableBody = legs.value.map((leg, index) => [
    index + 1,
    leg.distributorname,
    leg.leg_distributoridno,
    leg.distributorposition,
    (leg.personal_bv ?? 0).toLocaleString(),
    (leg.group_bv ?? 0).toLocaleString(),
  ])

  autoTable(doc, {
    startY: 38,
    head: [['#', 'Distributor Name', 'Distributor ID', 'Position', 'Personal BV', 'Group BV']],
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [33, 150, 243], // Quasar blue
    },
    columnStyles: {
      0: { cellWidth: 8 },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
  })

  // Save
  doc.save(
    `Group_BV_${form.value.distributoridno}_${form.value.date_from}_${form.value.date_to}.pdf`,
  )
}
</script>
