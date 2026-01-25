<template>
  <q-page class="q-pa-sm">
    <!-- 🔍 Search -->
    <DistributorSearch v-model="rootId" v-model:name="rootName" />

    <q-input v-model="startDate" type="date" label="From" dense class="q-mt-sm" />
    <q-input v-model="endDate" type="date" label="To" dense />

    <q-btn
      label="Load Genealogy"
      color="primary"
      class="full-width q-mt-sm"
      @click="loadRoot"
      :loading="loading"
      :disable="!rootId"
    />

    <!-- 🧾 EXPORT ACTIONS -->
    <div class="row justify-center q-mt-md">
      <q-btn
        label="Export PDF"
        :disable="!nodes.length"
        color="primary"
        class="q-mx-sm"
        @click="exportPDF"
      />

      <q-btn label="Export Excel" color="accent" class="q-mx-sm" @click="exportExcel" />
    </div>

    <!-- 📦 EVERYTHING INSIDE HERE WILL BE EXPORTED -->
    <div ref="reportRef" class="q-mt-md">
      <div v-if="rootId" class="text-caption q-mb-sm">
        <b>Root:</b> {{ rootName }} ({{ rootId }})<br />
        <b>Period:</b> {{ startDate }} → {{ endDate }}
      </div>

      <q-list bordered>
        <GeneNode
          v-for="node in nodes"
          :key="node.out_distributoridno"
          :node="node"
          :startDate="startDate"
          :endDate="endDate"
          :depth="1"
        />
      </q-list>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from 'src/boot/supabase'
import GeneNode from './GeneNode.vue'
import DistributorSearch from 'components/DistributorSearch.vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { useQuasar } from 'quasar'
const $q = useQuasar()

const rootId = ref('') // DistributorIDNO (from search)
const rootName = ref('') // DistributorNames (from search)

const startDate = ref('')
const endDate = ref('')
const nodes = ref([])
const loading = ref(false)

async function loadRoot() {
  if (!rootId.value) return

  // 🚫 BLOCK if dates not selected
  if (!startDate.value || !endDate.value) {
    $q.notify({
      type: 'warning',
      position: 'top',
      message: 'Please select BOTH From and To dates before loading genealogy',
    })
    return
  }

  loading.value = true
  nodes.value = []

  const { data, error } = await supabase.rpc('get_direct_children_with_bv', {
    p_root: rootId.value,
    p_date_from: startDate.value,
    p_date_to: endDate.value,
  })

  loading.value = false

  if (error) {
    console.error(error)
    $q.notify({
      type: 'negative',
      message: 'Failed to load genealogy data',
    })
    return
  }

  const safeData = Array.isArray(data) ? data : []

  // ✅ Only immediate children
  nodes.value = safeData.filter((d) => d.out_parentidno === rootId.value)
}

const reportRef = ref(null)

async function exportPDF() {
  if (!reportRef.value) return

  const canvas = await html2canvas(reportRef.value, {
    scale: 2,
    useCORS: true,
    scrollY: -window.scrollY,
  })

  const imgData = canvas.toDataURL('image/png')

  const pdf = new jsPDF('p', 'mm', 'a4')

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = (canvas.height * pageWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)

  pdf.save(`Genealogy_${rootId.value}.pdf`)
}
function flattenNodes(nodes, level = 1, result = []) {
  for (const n of nodes) {
    result.push({
      Level: level,
      DistributorIDNO: n.out_distributoridno ?? '',
      DistributorName: n.distributorname ?? n.out_distributorname ?? '',
      PBV: n.personal_bv ?? n.out_pbv ?? 0,
      GBV: n.group_bv ?? n.out_gbv ?? 0,
    })

    if (Array.isArray(n.children) && n.children.length) {
      flattenNodes(n.children, level + 1, result)
    }
  }
  return result
}

function exportExcel() {
  const rows = flattenNodes(nodes.value)

  if (!rows.length) return

  const headers = ['Level', 'DistributorIDNO', 'DistributorName', 'PBV', 'GBV']

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: headers,
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Genealogy')

  XLSX.writeFile(workbook, `Genealogy_${rootId.value}.xlsx`)
}
</script>
