<template>
  <div>
    <!-- Label -->
    <div class="text-caption text-green-10 text-bold q-mb-xs flex justify-between items-center">
      <span>{{ $t('searchByName') }}</span>
      <span
        v-if="searchQuery.trim() !== '' && !filteredDistributors.length && !confirmedDistributor"
        class="text-red"
      >
        No results found
      </span>
    </div>

    <!-- Input -->
    <q-input
      v-model="searchQuery"
      dense
      outlined
      class="white-input text-semi-bold text-center text-uppercase"
      input-class="text-white text-bold text-center text-uppercase"
    />

    <!-- Suggestions -->
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
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from 'boot/supabase'

// ✅ v-model for DistributorIDNO
const modelValue = defineModel()

const searchQuery = ref('')
const filteredDistributors = ref([])
const confirmedDistributor = ref(false)

// 🔍 Fetch distributors
const fetchDistributors = async (query) => {
  if (!query.trim()) {
    filteredDistributors.value = []
    return
  }

  const { data, error } = await supabase
    .from('Distributors')
    .select('DistributorIDNO, DistributorNames')
    .ilike('DistributorNames', `%${query}%`)

  if (!error && data) {
    filteredDistributors.value = data
  } else {
    filteredDistributors.value = []
  }
}

// ✅ On click select
const selectDistributor = (distributor) => {
  modelValue.value = distributor.DistributorIDNO
  searchQuery.value = distributor.DistributorNames
  confirmedDistributor.value = true
  filteredDistributors.value = []
}

// 🔄 Watch for input changes
watch(searchQuery, (val) => {
  if (!val.trim()) {
    modelValue.value = ''
    confirmedDistributor.value = false
    filteredDistributors.value = []
  } else {
    fetchDistributors(val)
  }
})
</script>

<style scoped>
.suggestion-list {
  border: 1px solid #ccc;
  max-height: 150px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  list-style: none;
  background-color: #000; /* black background */
  color: #fff; /* white text */
}
.distributor-option {
  padding: 8px;
  cursor: pointer;
}
.distributor-option:hover {
  background: #b7e033;
}
</style>
