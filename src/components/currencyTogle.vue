<template>
  <div>
    <!-- Toggle -->
    <div class="row items-center q-gutter-sm q-mb-sm text-light-green-14">
      <q-radio v-model="currencyType" val="dollar" label="Dollars" dense color="light-green-14" />
      <q-radio
        v-model="currencyType"
        val="local"
        label="Local Currency"
        dense
        color="light-green-14"
      />
    </div>

    <!-- Display converted values -->
    <slot :currencyType="currencyType" :convert="convert"></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSalesStore } from '../stores/salesStore'

const store = useSalesStore()

const currencyType = ref('dollar')

const convert = (amount) => {
  const rate = store.headerData?.exchangeRate || 1
  const num = parseFloat(amount) || 0

  if (currencyType.value === 'local') {
    return `${(num * rate).toFixed(2)} FC`
  }
  return `${num.toFixed(2)} $`
}
</script>
