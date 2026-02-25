<template>
  <q-expansion-item
    dense
    class="q-mb-xs gene-node"
    expand-icon="chevron_right"
    @show="onExpand"
    :disable="!node.has_children"
  >
    <!-- HEADER -->
    <template #header>
      <div class="row items-center full-width q-px-sm">
        <!-- LEFT COLUMN: Name + ID -->
        <div class="col-6 col-sm-5 text-left text-weight-medium">
          <div class="ellipsis">
            {{ node.distributorname }}
          </div>

          <!-- ID below name (mobile only) -->
          <div class="text-caption text-grey-7 lt-sm">
            {{ node.out_distributoridno }}
          </div>
        </div>

        <!-- CENTER COLUMN: ID (desktop only) -->
        <div class="col-3 text-center text-caption text-grey-7 gt-xs">
          {{ node.out_distributoridno }}
        </div>

        <!-- RIGHT COLUMN: PBV + GBV -->
        <div class="col-6 col-sm-4 text-right text-caption">
          <div class="text-primary text-bold">PBV: {{ node.personal_bv }}</div>

          <!-- GBV below PBV (mobile only) -->
          <div class="text-positive lt-sm text-bold">GBV: {{ gbv }}</div>

          <!-- GBV inline (desktop only) -->
          <span class="q-ml-xs text-positive gt-xs text-bold"> GBV: {{ gbv }} </span>
        </div>
      </div>
    </template>

    <!-- LOADER -->
    <q-inner-loading :showing="loading">
      <div class="text-center q-pa-sm">Loading...</div>
    </q-inner-loading>

    <!-- CHILD NODES -->
    <q-list v-if="children.length">
      <GeneNode
        v-for="child in children"
        :key="child.out_distributoridno"
        :node="child"
        :startDate="startDate"
        :endDate="endDate"
      />
    </q-list>
  </q-expansion-item>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from 'src/boot/supabase'
import GeneNode from './GeneNode.vue'

const props = defineProps({
  node: Object, // Distributor node
  startDate: String, // From date
  endDate: String, // To date
})

const children = ref([]) // Direct children nodes
const loading = ref(false) // Loader while fetching children
const gbv = ref(0) // Group BV for this node
const loaded = ref(false) // Tracks if children already loaded

// Compute the label text: Name | PBV | GBV
//const nodeLabel = computed(() => {
// return `${props.node.out_distributoridno}|${props.node.distributorname} | PBV: ${props.node.personal_bv} | GBV: ${gbv.value}`
//})

// Load children and GBV when node expands
async function onExpand() {
  if (loaded.value) return // Already loaded

  loading.value = true

  try {
    // 1️⃣ Load direct children
    const { data: childrenData, error: childrenError } = await supabase.rpc(
      'get_direct_children_with_bv',
      {
        p_root: props.node.out_distributoridno,
        p_date_from: props.startDate,
        p_date_to: props.endDate,
      },
    )

    if (!childrenError && Array.isArray(childrenData)) {
      children.value = childrenData
    }

    // 2️⃣ Load GBV for this node (recursive)
    const { data: gbvData, error: gbvError } = await supabase.rpc('compute_group_bv', {
      p_distributor: props.node.out_distributoridno,
      p_date_from: props.startDate,
      p_date_to: props.endDate,
    })

    if (!gbvError) {
      gbv.value = gbvData
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
    loaded.value = true
  }
}
</script>

<style scoped>
/* Indent children for better mobile readability */
.q-expansion-item {
  padding-left: 12px;
}

/* Default (collapsed) node divider */
.gene-node {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* Minimum touch-friendly height */
.gene-node .q-expansion-item__container {
  min-height: 42px;
}

/* ============================= */
/* EXPANDED NODE NAME STYLING */
/* ============================= */

/* Only the expanded node's NAME turns green */
.gene-node.q-expansion-item--expanded .q-expansion-item__header .col-5 {
  color: #21ba45; /* Quasar green */
  font-weight: 600;
}

/* Optional: subtle background highlight for expanded node */
.gene-node.q-expansion-item--expanded {
  background-color: rgba(33, 186, 69, 0.05);
}

/* Remove divider when expanded (clean look) */
.gene-node.q-expansion-item--expanded {
  border-bottom: none;
}
</style>
