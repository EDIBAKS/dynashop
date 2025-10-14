<template>
  <q-page class="flex flex-center q-pa-none">
    <q-card
      class="q-pa-sm bg-transparent"
      style="max-width: 800px; width: 100%; border: 0; box-shadow: none"
    >
      <q-banner class="bg-orange-8 text-white q-mb-md" rounded dense inline-actions>
        🚧 This page is currently under construction.
      </q-banner>

      <!-- Your future content goes here -->
    </q-card>
  </q-page>
</template>

<script setup></script>

<style scoped>
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.table-responsive {
  overflow-x: auto;
}
th,
td {
  padding: 4px 8px;

  text-align: left;
}
@media (max-width: 600px) {
  th,
  td {
    font-size: 0.85rem;
  }
}
/* Apply to all outlined inputs/selects inside your form */
.custom-form ::v-deep(.q-field--outlined .q-field__control) {
  border: 2px solid #b6acac !important; /* darker border */
  border-radius: 8px; /* optional: smoother edges */
}

/* Stronger border on hover */
.custom-form ::v-deep(.q-field--outlined:hover .q-field__control) {
  border-color: #111 !important;
}

/* Stronger + colored border when focused */
.custom-form ::v-deep(.q-field--outlined.q-field--focused .q-field__control) {
  border: 2px solid #0d47a1 !important; /* deep blue when focused */
  box-shadow: 0 0 4px rgba(13, 71, 161, 0.5); /* optional glow */
}
.custom-list {
  font-size: 14px; /* default */
  border: 1.5px solid #1b5e20; /* stronger blue border */
  background-color: #f7f3f3; /* light background */
  border-radius: 6px; /* keep rounded look */
}

.custom-list .q-item__label {
  white-space: nowrap; /* ✅ prevent text from wrapping */
  overflow: hidden; /* optional: hide overflow */
  text-overflow: ellipsis; /* optional: show "..." */
}
.currency-display .amount {
  font-size: 1.4rem; /* bigger number */
  font-weight: bold;
}

.currency-display .currency {
  font-size: 1.2rem; /* smaller than amount */
  margin-left: 4px; /* space between number and currency */
  opacity: 0.8; /* subtle */
}
.select-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden; /* ensures dropdown stays within parent */
}

.custom-select {
  width: 100%;
  padding: 8px;
  border: 1px solid white;
  border-radius: 8px;
  background-color: #263238; /* matches Quasar bg-blue-grey-10 */
  color: white;
  text-align: center;
  appearance: none;
  box-sizing: border-box;
  max-width: 100%; /* prevent overflow */
}

.custom-select option {
  background-color: #263238; /* matches Quasar bg-blue-grey-10 */
  color: white;
}

.custom-select:focus {
  outline: none;
  border-color: #00bfa5;
}
</style>
