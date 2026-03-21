<template>
  <q-page class="q-pa-sm bg-transparent">
    <q-card class="q-pa-sm bg-transparent responsive-card" style="border: 0; box-shadow: none">
      <!-- Header -->
      <q-card-section class="row justify-left">
        <div class="column items-end">
          <!-- For dailySales or tallys: show shopName and reportType -->
          <div
            v-if="
              form.reportType === 'dailySales' ||
              form.reportType === 'tallys' ||
              form.reportType === 'sales' ||
              form.reportType === 'bestCustomers'
            "
            class="text-white"
          >
            <!-- Shop Name -->
            <div class="text-h6 text-white text-bold">
              {{ shopName }}
            </div>

            <!-- Report Title -->
            <div class="text-subtitle1 text-bold q-mt-xs">
              {{
                form.reportType === 'dailySales'
                  ? $t('dailySales')
                  : form.reportType === 'tallys'
                    ? $t('tallies')
                    : form.reportType === 'sales'
                      ? $t('salesPerDay')
                      : ''
              }}
            </div>

            <!-- 🔥 Pending Receipts Indicator -->
            <div class="row items-center q-mt-sm q-gutter-sm">
              <!-- Loader -->
              <q-spinner v-if="pendingLoading" size="16px" color="orange" />

              <!-- Counter -->
              <q-chip
                v-else
                dense
                :icon="pendingCount === 0 ? 'check_circle' : 'pending_actions'"
                :color="pendingCount === 0 ? 'light-green-14' : 'orange-9'"
                text-color="black"
                class="text-bold"
              >
                {{
                  pendingCount === 0 ? $t('allCleared') : pendingCount + ' ' + $t('pendingReceipts')
                }}
              </q-chip>
            </div>
          </div>

          <!-- For personalBV: show DistributorName and reportType, hide shopName -->
          <div v-else-if="form.reportType === 'personalBV' && paginatedSales.length">
            <div class="text-subtitle1 text-green-10 text-bold q-mt-xs">
              Personal BV - <br />{{ paginatedSales[0].distributorName || 'Unknown' }}
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-section class="custom-form">
        <!-- Report type -->
        <div class="col-12 col-sm-4 col-md-3">
          <div class="text-caption text-bold q-mb-xs text-white">
            {{ $t('report') }}
          </div>
          <div class="select-wrapper">
            <select
              v-model="form.reportType"
              class="custom-select native-select full-width text-center"
            >
              <!-- Default translated placeholder -->
              <option value="">
                {{ $t('select_report_type') }}
              </option>

              <!-- Real selectable options -->
              <option v-for="option in reportOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Start Date -->
        <div class="col-12 col-sm-4 text-white col-md-3">
          <div class="text-caption text-bold q-mb-xs">{{ $t('startDate') }}</div>
          <q-input
            v-model="form.startDate"
            type="date"
            label="Start Date"
            input-class="text-white text-center"
            label-color="white"
            dense
            outlined
            class="full-width"
          />
        </div>

        <!-- End Date -->
        <div class="col-12 text-white col-sm-4 col-md-3">
          <div class="text-caption text-bold q-mb-xs">{{ $t('endDate') }}</div>
          <q-input
            v-model="form.endDate"
            type="date"
            label="End Date"
            dense
            outlined
            class="full-width"
            input-class="text-white text-center"
            label-color="white"
          />
        </div>
        <div class="row items-center q-col-gutter-sm q-mt-md" style="width: 100%">
          <div class="col">
            <div
              v-if="form.reportType === 'dailySales'"
              class="text-caption text-bold text-white q-mb-xs"
            >
              {{ $t('from') }}
            </div>
            <q-input
              v-if="form.reportType === 'dailySales'"
              v-model="fromReceipt"
              label="From Receipt No"
              input-class="text-center text-white text-bold"
              outlined
              dense
              @update:model-value="(val) => (fromReceipt = val.toUpperCase())"
            />
          </div>

          <div class="col">
            <div
              v-if="form.reportType === 'dailySales'"
              class="text-caption text-bold text-white q-mb-xs"
            >
              {{ $t('to') }}
            </div>
            <q-input
              v-if="form.reportType === 'dailySales'"
              v-model="toReceipt"
              label="To Receipt No"
              input-class="text-center text-white text-bold"
              outlined
              dense
              @update:model-value="(val) => (toReceipt = val.toUpperCase())"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-section class="custom-form">
        <!-- DPC select / input -->
        <div
          class="col-12 col-md-3"
          v-if="
            ['dailySales', 'tallys', 'sales', 'stock', 'queriedSales', 'bestCustomers'].includes(
              form.reportType,
            )
          "
        >
          <div class="text-caption text-bold text-white text-bold q-mb-xs">Shop</div>
          <select
            v-if="permissions.canSelectDpc"
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

        <!-- Distributor ID + Search (only when personalBV) -->

        <div class="col-12 col-md-3">
          <!-- Distributor ID -->
          <div
            v-if="form.reportType === 'personalBV'"
            class="text-caption text-white text-bold q-mb-xs"
          >
            {{ $t('distributorID') }}
          </div>
          <q-input
            v-if="form.reportType === 'personalBV'"
            v-model="form.distributoridno"
            label="Distributor ID"
            dense
            outlined
            caps
            class="q-mt-md"
            input-class="text-center text-white text-bold"
            @update:model-value="(val) => (form.distributoridno = val.toUpperCase())"
          />

          <!-- Distributor Search -->
          <DistributorSearch
            v-if="form.reportType === 'personalBV'"
            v-model="form.distributoridno"
          />
        </div>
      </q-card-section>
      <q-card-section class="custom-form">
        <!-- Fetch Button -->
        <div class="col-12 col-md-3 flex items-end">
          <q-btn
            :label="$t('fetchSales')"
            @click="fetchData"
            class="full-width bg-green-14 text-white"
          />
        </div>
      </q-card-section>
      <q-card-section>
        <!-- Loading GIF -->
        <div v-if="salesStore.loading" class="q-mt-md flex flex-center">
          <q-spinner-hourglass color="light-green" size="25px" />
        </div>
      </q-card-section>

      <q-card-section class="custom-form">
        <div v-if="salesStore.error" class="text-orange q-mt-md">{{ salesStore.error }}</div>

        <!-- Controls -->
        <!--
        
         -->

        <div class="row items-center justify-center q-gutter-md q-mb-md">
          <!-- Rows per Page -->

          <select v-model="rowsPerPage" class="pagination-select native-select">
            <option v-for="opt in pageOptions" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>

          <!-- New QPagination Control -->
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            direction-links
            outline
            color="white"
            active-design="unelevated"
            active-color="brown"
            active-text-color="orange"
            @update:model-value="changePage"
          />
        </div>
      </q-card-section>

      <!-- Sales Results -->
      <q-card-section class="q-pa-sm bg-transparent" style="border-radius: 12px">
        <CurrencyToggle v-slot="{ convert }">
          <!-- Daily Sales -->
          <template v-if="form.reportType === 'dailySales'">
            <reportExporter reportType="dailySales" :reportData="paginatedSales" />
            <!-- ✅ Show "No Data Found" Banner -->
            <q-banner
              v-if="!paginatedSales || paginatedSales.length === 0"
              class="bg-grey-2 text-center text-dark q-pa-md q-mt-md"
              rounded
            >
              <q-icon name="info" color="primary" size="md" class="q-mr-sm" />
              {{ $t('noDataFound') || 'No data found for the selected filters.' }}
            </q-banner>
            <!-- ✅ Show Sales Cards Only If There Is Data -->
            <div v-else>
              <div v-for="sale in paginatedSales" :key="sale.receiptno" class="q-mt-md">
                <q-card flat bordered>
                  <!-- Section 1: Receipt & Date -->
                  <q-card-section class="row justify-between items-center">
                    <div class="column">
                      <div class="text-h6 text-weight-medium text-green-14">
                        <b>{{ $t('receiptNo') }}:</b> {{ sale.receiptno }}
                      </div>
                      <div>
                        <q-chip
                          dense
                          size="md"
                          icon="sell"
                          text-color="white"
                          text-center
                          :color="statusColor(sale.status)"
                          >{{ sale.status }}</q-chip
                        >
                        <q-chip
                          dense
                          size="md"
                          icon="person"
                          text-color="white"
                          text-center
                          :color="statusColor(sale.status)"
                          >{{ sale.createdby || 'Unknown' }}</q-chip
                        >
                      </div>
                    </div>

                    <div class="column">
                      <div class="text-subtitle2">
                        <b>SaleDate:</b> {{ formatDateTime(sale.salesdate) }}
                      </div>

                      <div class="text-orange-14">
                        {{ $t('lastmodified') }}: {{ formatDateTime(sale.lastmodified) }}
                      </div>
                    </div>
                    <div class="column">
                      <div>
                        <b>{{ $t('distributorID') }}:</b> {{ sale.distributoridno }}
                      </div>
                      <div class="text-red-9 text-bold">
                        <b>Name:</b> {{ sale.distributorname || 'Fetching...' }}
                      </div>
                    </div>
                  </q-card-section>
                  <q-separator />

                  <!-- Section 3: Products -->
                  <q-card-section class="q-pa-xs">
                    <div
                      v-for="(item, i) in sale.salesdetails"
                      :key="i"
                      class="row items-center no-wrap q-mb-xs"
                      style="font-size: var(--product-font-size)"
                    >
                      <!-- Product Code -->
                      <div class="col-2 text-truncate">{{ item.productcode }}</div>

                      <!-- Product Name: take most space -->
                      <div class="col-5 text-truncate" style="min-width: 0">
                        {{ item.productname || 'Fetching...' }}
                      </div>

                      <!-- Quantity -->
                      <div class="col-1 text-right">{{ item.quantity }}</div>

                      <!-- Price -->
                      <div class="col-2 text-right">
                        {{ (item.unitprice * item.quantity).toFixed(2) }}
                      </div>

                      <!-- BV -->
                      <div class="col-2 text-right">
                        {{ (item.unitbv * item.quantity).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Section 4: Totals & Actions -->
                  <q-card-section class="row items-center justify-between q-pt-xs q-pb-xs no-wrap">
                  </q-card-section>
                  <q-card-section class="row items-center justify-between q-pt-xs q-pb-xs no-wrap">
                    <div
                      class="row items-center justify-between q-gutter-md no-wrap"
                      style="width: 100%"
                    >
                      <!-- Totals -->
                      <div class="flex-grow" style="flex: 1 1 auto; min-width: 0">
                        <b>{{ $t('TotalPrice') }}</b> {{ totalPrice(sale).toFixed(2) }} $
                      </div>
                      <div
                        class="flex-grow text-blue-10 text-bold"
                        style="flex: 1 1 auto; min-width: 0; text-align: center"
                      >
                        <q-icon name="mdi-piggy-bank" size="18px" class="q-mr-xs" />
                        {{ (totalPrice(sale) * exchangeRate).toFixed(0) }}
                      </div>
                      <div
                        class="flex-grow text-orange-10"
                        style="flex: 1 1 auto; min-width: 0; text-align: right"
                      >
                        <b>{{ $t('totalBV') }}:</b> {{ totalBV(sale).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />
                  <q-card-section class="row justify-center items-center q-pt-xs q-pb-xs">
                    <div class="row justify-evenly items-center full-width q-gutter-xs wrap">
                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        style="color: orange"
                        label="Update"
                        icon="edit_note"
                        @click="
                          $router.push({ name: 'EditSale', params: { receiptno: sale.receiptno } })
                        "
                      />

                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        style="color: red"
                        icon="delete"
                        label="Delete"
                        @click="confirmDeleteReceipt(sale)"
                      />

                      <q-btn
                        flat
                        no-caps
                        :color="sale.status === 'pending' ? 'red' : 'green'"
                        :icon="sale.status === 'pending' ? 'check_circle' : 'warning'"
                        :label="sale.status === 'pending' ? $t('markCorrect') : $t('setPending')"
                        :disable="sale.status === 'pending' && !isAdmin"
                        @click="toggleStatus(sale)"
                      />
                    </div>
                  </q-card-section>
                  <q-separator />
                </q-card>
                <q-dialog v-model="editDialog">
                  <q-card style="min-width: 400px">
                    <q-card-section>
                      <div class="text-h6">{{ $t('EditReciept') }}</div>
                    </q-card-section>

                    <q-card-section>
                      <q-input
                        v-model="editForm.distributoridno"
                        label="Distributor ID"
                        dense
                        outlined
                      />
                      <q-input v-model="editForm.dpccode" label="DPC Code" dense outlined />
                      <q-input
                        v-model="editForm.salesdate"
                        label="Sales Date"
                        type="date"
                        dense
                        outlined
                      />
                      <!-- Product details would go here (table or list) -->
                    </q-card-section>

                    <q-card-actions align="right">
                      <q-btn flat label="Cancel" v-close-popup />
                      <q-btn color="primary" label="Save" @click="submitUpdate" />
                    </q-card-actions>
                  </q-card>
                </q-dialog>
              </div>
            </div>
          </template>

          <!-- Personal BV -->
          <template v-else-if="form.reportType === 'personalBV'">
            <!-- No sales found message -->

            <div v-if="paginatedSales.length === 0" class="q-pa-md flex flex-center">
              <div class="text-orange text-h6 text-center">
                {{ $t('NoSales') }} {{ form.distributoridno || 'the selected distributor' }}.
              </div>
            </div>
            <reportExporter reportType="personalBV" :reportData="salesByDistributor" />

            <!-- Totals at the top -->
            <q-card flat bordered class="q-mb-md bg-grey-1" v-if="paginatedSales.length"> </q-card>

            <!-- Loop over distributors -->
            <div v-for="group in salesByDistributor" :key="group.distributoridno" class="q-mt-md">
              <!-- Paginated receipts for this distributor -->
              <div v-for="sale in group.sales" :key="sale.receiptno" class="q-mt-sm">
                <q-card flat bordered>
                  <q-card-section class="row justify-between items-center">
                    <div class="column">
                      <div class="text-h6 text-weight-medium text-green-14">
                        <b>{{ $t('receiptNo') }}:</b> {{ sale.receiptno }}
                      </div>
                      <div>
                        <q-chip
                          dense
                          size="md"
                          icon="sell"
                          text-color="white"
                          text-center
                          :color="statusColor(sale.status)"
                          >{{ sale.status }}</q-chip
                        >
                        <q-chip
                          dense
                          size="md"
                          icon="person"
                          text-color="white"
                          text-center
                          :color="statusColor(sale.status)"
                          >{{ sale.createdby || 'Unknown' }}</q-chip
                        >
                      </div>
                    </div>

                    <div class="column">
                      <div class="text-subtitle2">
                        <b>SaleDate:</b> {{ formatDateTime(sale.salesdate) }}
                      </div>

                      <div class="text-orange-14">
                        {{ $t('lastmodified') }}: {{ formatDateTime(sale.lastmodified) }}
                      </div>
                    </div>
                    <div class="column">
                      <div>
                        <b>{{ $t('distributorID') }}:</b> {{ sale.distributoridno }}
                      </div>
                      <div class="text-red-9 text-bold">
                        <b>Name:</b> {{ sale.distributorname || 'Fetching...' }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Sale items -->
                  <q-card-section class="q-pa-xs">
                    <div
                      v-for="(item, i) in sale.salesdetails || []"
                      :key="i"
                      class="row items-center no-wrap q-mb-xs"
                      style="font-size: var(--product-font-size)"
                    >
                      <div class="col-2 text-truncate">{{ item?.productcode || 'N/A' }}</div>
                      <div class="col-4 text-truncate">{{ item.productname || 'Fetching...' }}</div>
                      <div class="col-2 text-right">{{ item.quantity }}</div>
                      <div class="col-2 text-right">
                        {{ (item.unitprice * item.quantity).toFixed(2) }}
                      </div>
                      <div class="col-2 text-right">
                        {{ (item.unitbv * item.quantity).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <q-card-section class="row items-center justify-between q-pt-xs q-pb-xs no-wrap">
                    <div class="row items-center q-gutter-md no-wrap">
                      <div>
                        <b>{{ $t('totalAmount') }}:</b> {{ totalPrice(sale).toFixed(2) }} $
                      </div>
                      <div>{{ (totalPrice(sale) * exchangeRate).toFixed(0) }} FCFA</div>
                      <div>
                        <b>{{ $t('totalBV') }}:</b> {{ totalBV(sale).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <!-- Actions -->
                  <q-card-section class="row justify-center items-center q-pt-xs q-pb-xs">
                    <div class="row justify-evenly items-center full-width q-gutter-xs wrap">
                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        style="color: orange"
                        label="Update"
                        icon="edit_note"
                        @click="
                          $router.push({ name: 'EditSale', params: { receiptno: sale.receiptno } })
                        "
                      />

                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        style="color: red"
                        icon="delete"
                        :label="$t('delete')"
                        @click="confirmDeleteReceipt(sale)"
                      />

                      <q-btn
                        flat
                        no-caps
                        :color="sale.status === 'pending' ? 'red' : 'green'"
                        :icon="sale.status === 'pending' ? 'check_circle' : 'warning'"
                        :label="sale.status === 'pending' ? 'Mark Correct' : 'Set Pending'"
                        :disable="sale.status === 'pending' && !isAdmin"
                        @click="toggleStatus(sale)"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </template>

          <!-- Tallies -->
          <template v-else-if="form.reportType === 'tallys'">
            <!-- Radio buttons for Daily / Monthly -->

            <q-card flat bordered class="q-mb-md bg-grey-1">
              <q-card-section class="row items-center justify-start q-gutter-sm flex-wrap">
                <q-radio
                  v-model="tallyType"
                  val="daily"
                  :label="$t('daily')"
                  color="green-10"
                  dense
                />

                <q-radio
                  v-model="tallyType"
                  val="monthly"
                  :label="$t('monthly')"
                  color="green-10"
                  dense
                />
                <!-- Debug raw store data -->
              </q-card-section>

              <reportExporter
                reportType="tallys"
                :reportData="tallyType === 'daily' ? dailyTallies : monthlyTallies"
                :dpccode="form.dpccode"
                :startDate="form.startDate"
                :endDate="form.endDate"
                :extraInfo="{ tallyType }"
              />
            </q-card>

            <!-- Daily view -->
            <div v-if="tallyType === 'daily'">
              <div v-if="!dailyTallies.length" class="text-center text-red q-mt-md">
                {{ $t('NoTallies') }}
              </div>

              <q-card v-for="day in dailyTallies" :key="day.date" flat bordered class="q-mb-md">
                <q-card-section class="text-bold">
                  {{ formatDateTime(day.date) }}
                </q-card-section>

                <q-table
                  :rows="day.items"
                  :columns="tallyColumns"
                  row-key="productcode"
                  dense
                  flat
                  separator="horizontal"
                >
                  <!-- Quantity highlight -->
                  <template #body-cell-quantity="props">
                    <q-td :props="props" class="text-blue-9 text-bold">
                      {{ props.value }}
                    </q-td>
                  </template>

                  <!-- Amount -->
                  <template #body-cell-amount="props">
                    <q-td :props="props">
                      {{ convert((props.row.unitprice * props.row.quantity).toFixed(2)) }}
                    </q-td>
                  </template>

                  <!-- Footer totals -->
                  <template #bottom>
                    <div class="row justify-end text-bold q-pa-sm bg-grey-3 full-width">
                      <div class="q-mr-md">
                        Products:
                        {{ day.items.reduce((s, i) => s + i.quantity, 0) }}
                      </div>
                      <div class="q-mr-md">
                        BV:
                        {{ day.items.reduce((s, i) => s + i.bvs * i.quantity, 0).toFixed(2) }}
                      </div>
                      <div>
                        Total:
                        {{
                          convert(
                            day.items.reduce((s, i) => s + i.unitprice * i.quantity, 0).toFixed(2),
                          )
                        }}
                      </div>
                    </div>
                  </template>
                </q-table>
              </q-card>
            </div>

            <!-- Monthly view -->
            <div v-else-if="tallyType === 'monthly'">
              <div v-if="!monthlyTallies.length" class="text-center text-red q-mt-md">
                No monthly tallies found for the selected date range.
              </div>

              <q-card
                v-else
                flat
                bordered
                class="q-mb-md"
                v-for="monthItem in monthlyTallies"
                :key="monthItem.month"
              >
                <q-card-section>
                  <!-- Month header -->
                  <div class="text-h6 text-bold text-primary q-mb-sm">
                    {{ monthItem.month }}
                  </div>

                  <q-table
                    :rows="monthItem.items"
                    :columns="monthlyColumns"
                    row-key="productcode"
                    dense
                    flat
                    separator="horizontal"
                    v-model:pagination="monthPagination"
                    :rows-per-page-options="[5, 10, 15, 0]"
                    :pagination="monthPagination"
                  >
                    <!-- Quantity -->
                    <template #body-cell-totalQuantity="props">
                      <q-td :props="props" align="right" class="text-blue-9 text-bold">
                        {{ props.value }}
                      </q-td>
                    </template>

                    <!-- Distributor Price -->
                    <template #body-cell-unitprice="props">
                      <q-td :props="props" align="right">
                        {{ convert(props.value.toFixed(2)) }}
                      </q-td>
                    </template>

                    <!-- BV -->
                    <template #body-cell-totalBvs="props">
                      <q-td :props="props" align="right">
                        {{ props.value.toFixed(2) }}
                      </q-td>
                    </template>

                    <!-- Amount -->
                    <template #body-cell-totalAmount="props">
                      <q-td :props="props" align="right">
                        {{ convert(props.value.toFixed(2)) }}
                      </q-td>
                    </template>

                    <!-- Footer Totals -->
                    <template #bottom>
                      <q-tr>
                        <q-td colspan="2" class="text-right text-bold">Totals:</q-td>
                        <q-td class="text-right text-bold">{{ monthItem.quantityTotal }}</q-td>
                        <q-td class="text-right text-bold">-</q-td>
                        <q-td class="text-right text-bold">{{
                          monthItem.bvsTotal.toFixed(2)
                        }}</q-td>
                        <q-td class="text-right text-bold">{{
                          convert(monthItem.amountTotal.toFixed(2))
                        }}</q-td>
                      </q-tr>
                    </template>
                  </q-table>
                </q-card-section>
              </q-card>
            </div>
          </template>

          <template v-else-if="form.reportType === 'sales'">
            <q-card flat bordered class="q-mb-md bg-grey-1">
              <reportExporter
                reportType="sales"
                :reportData="dailySalesTotals"
                :dpccode="form.dpccode"
                :startDate="form.startDate"
                :endDate="form.endDate"
              />

              <!-- Report Header -->
              <q-card-section v-if="reportData && reportData.length > 0" class="q-pa-sm bg-grey-2">
                <div class="row justify-between items-center">
                  <div>
                    <div><strong>Report Type:</strong> {{ form.reportType }}</div>
                    <div><strong>DPC:</strong> {{ shopName }}</div>
                  </div>
                  <div class="text-right">
                    <div><strong>Date:</strong> {{ currentDate }}</div>
                    <div><strong>User:</strong> {{ auth.userDetails.firstname }}</div>
                  </div>
                </div>
              </q-card-section>

              <!-- Daily Sales Totals -->
              <div v-if="!dailySalesTotals.length" class="text-center text-red q-mt-md">
                No sales found for the selected date range.
              </div>

              <q-card v-else flat bordered class="q-mb-md">
                <q-card-section>
                  <div class="table-responsive">
                    <table class="q-table q-mb-sm q-table--striped" style="width: 100%">
                      <thead>
                        <tr>
                          <th class="text-uppercase text-bold">{{ $t('Date') }}</th>
                          <th class="text-uppercase text-bold">{{ $t('TotalSales') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="day in dailySalesTotals" :key="day.date">
                          <td>{{ day.date }}</td>
                          <td>{{ convert(day.total.toFixed(2)) }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td class="text-right text-bold">Grand Total:</td>
                          <td class="text-bold">
                            {{
                              convert(
                                dailySalesTotals.reduce((sum, d) => sum + d.total, 0).toFixed(2),
                              )
                            }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </q-card-section>
              </q-card>
            </q-card>
          </template>
          <template v-else-if="form.reportType === 'stock'">
            <q-card flat bordered class="q-mb-md bg-grey-1">
              <reportExporter
                reportType="stock"
                :reportData="stock"
                :dpccode="form.dpccode"
                :startDate="form.startDate"
                :endDate="form.endDate"
              />
              <!-- Report Header -->
              <q-card-section v-if="reportData && reportData.length > 0" class="q-pa-sm bg-grey-2">
                <div class="row justify-between items-center">
                  <div>
                    <div><strong>Report Type:</strong> {{ form.reportType }}</div>
                    <div><strong>DPC:</strong> {{ shopName }}</div>
                  </div>
                  <div class="text-right">
                    <div><strong>Date:</strong> {{ currentDate }}</div>
                    <div><strong>User:</strong> {{ auth.userDetails.firstname }}</div>
                  </div>
                </div>
              </q-card-section>

              <!-- Daily Sales Totals -->
              <div v-if="!stock.length" class="text-center text-red q-mt-md">
                No stock found for the selected shop.
              </div>

              <q-card flat bordered class="q-mb-md">
                <!-- FILTERS -->
                <q-card-section class="q-gutter-sm">
                  <q-option-group
                    v-model="stockFilter"
                    :options="[
                      { label: 'All', value: 'all' },
                      { label: 'Above 20', value: 'above20' },
                      { label: 'Below 5', value: 'below5' },
                    ]"
                    type="radio"
                    inline
                  />
                </q-card-section>

                <!-- TABLE -->
                <q-card-section>
                  <div>
                    <q-table
                      :rows="filteredStock"
                      :columns="columns2"
                      row-key="productcode"
                      flat
                      bordered
                      dense
                      separator="cell"
                      :pagination="{ rowsPerPage: 0 }"
                      class="stock-table"
                    >
                      <!-- 🔥 ENHANCED HEADER (replaces title) -->
                      <template #top>
                        <div class="column full-width q-pb-sm">
                          <!-- Title row -->
                          <div class="row justify-between items-center">
                            <div class="text-h6">Stock Summary</div>

                            <div class="text-subtitle2 text-grey-7">
                              {{ currentDate }}
                            </div>
                          </div>

                          <!-- Info row -->
                          <div class="row justify-between items-center q-mt-xs">
                            <div class="text-subtitle2 text-primary">
                              <q-icon name="store" size="16px" class="q-mr-xs" />
                              {{ shopName }} ({{ form.dpccode }})
                            </div>

                            <div class="text-subtitle2">
                              <q-icon name="person" size="16px" class="q-mr-xs" />
                              {{ auth.userDetails.firstname }}
                            </div>
                          </div>
                        </div>
                      </template>

                      <!-- ✅ Quantity cell color logic (UNCHANGED) -->
                      <template #body-cell-quantity="props">
                        <q-td :props="props" :class="rowColor(props.row.quantity)">
                          {{ props.row.quantity }}
                        </q-td>
                      </template>

                      <!-- ✅ Product name wrap (UNCHANGED) -->
                      <template #body-cell-productname="props">
                        <q-td :props="props">
                          <div class="product-wrap">
                            {{ props.row.productname }}
                          </div>
                        </q-td>
                      </template>

                      <!-- ✅ Footer totals (UNCHANGED) -->
                      <template #bottom-row>
                        <q-tr>
                          <q-td colspan="3" class="text-right text-bold">Grand Totals:</q-td>
                          <q-td class="text-bold">
                            {{ convert(stockTotals.totalDpValue.toFixed(2)) }}
                          </q-td>
                          <q-td class="text-bold">
                            {{ stockTotals.totalBvValue.toFixed(2) }}
                          </q-td>
                        </q-tr>
                      </template>
                    </q-table>
                  </div>
                </q-card-section>
              </q-card>
            </q-card>
          </template>
          <template v-if="form.reportType === 'queriedSales'">
            <!-- Exporter -->

            <reportExporter
              reportType="dailySales"
              :reportData="paginatedSales"
              :dpccode="form.dpccode"
              :startDate="form.startDate"
              :endDate="form.endDate"
            />

            <!-- No Records Banner -->
            <div v-if="!paginatedSales.length" class="q-mt-lg">
              <q-banner dense rounded class="bg-grey-3 text-grey-8 text-center q-pa-sm">
                <q-icon name="info" color="primary" size="20px" class="q-mr-sm" />
                {{ $t('noRecordsFound') }}
              </q-banner>
            </div>

            <!-- Sales List -->
            <div v-else>
              <div v-for="sale in paginatedSales" :key="sale.receiptno" class="q-mt-md">
                <q-card flat bordered style="border-radius: 30px">
                  <!-- Section 1: Receipt & Date -->
                  <q-card-section class="row justify-between items-center">
                    <div class="text-subtitle2 text-bold text-green-14">
                      <b>{{ $t('receiptNo') }}:</b> {{ sale.receiptno }}
                    </div>
                    <div class="text-subtitle2">
                      <b>{{ $t('saleDate') }}:</b> {{ formatDateTime(sale.salesdate) }}
                    </div>
                  </q-card-section>

                  <!-- Section 2: Distributor info & status -->
                  <q-card-section class="row justify-between items-center q-pt-xs q-pb-xs">
                    <div class="column">
                      <div>
                        <b>{{ $t('distributorID') }}:</b> {{ sale.distributoridno }}
                      </div>
                      <div class="text-red-9 text-bold">
                        <b>{{ $t('name') }}:</b> {{ sale.distributorname || 'Fetching...' }}
                      </div>
                      <div class="text-orange-14">
                        {{ $t('lastmodified') }}: {{ formatDateTime(sale.lastmodified) }}
                      </div>
                    </div>
                    <div>
                      <q-chip :color="statusColor(sale.status)" text-color="white" class="q-mb-xs">
                        {{ sale.status }}
                      </q-chip>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Section 3: Products -->
                  <q-card-section class="q-pa-xs">
                    <div
                      v-for="(item, i) in sale.salesdetails"
                      :key="i"
                      class="row items-center no-wrap q-mb-xs"
                      style="font-size: var(--product-font-size)"
                    >
                      <div class="col-2 text-truncate">{{ item.productcode }}</div>
                      <div class="col-5 text-truncate" style="min-width: 0">
                        {{ item.productname || 'Fetching...' }}
                      </div>
                      <div class="col-1 text-right">{{ item.quantity }}</div>
                      <div class="col-2 text-right">
                        {{ (item.unitprice * item.quantity).toFixed(2) }}
                      </div>
                      <div class="col-2 text-right">
                        {{ (item.unitbv * item.quantity).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Section 4: Totals -->
                  <q-card-section class="row items-center justify-between q-pt-xs q-pb-xs no-wrap">
                    <div
                      class="row items-center justify-between q-gutter-md no-wrap"
                      style="width: 100%"
                    >
                      <div class="flex-grow">
                        <b>{{ $t('TotalPrice') }}</b> {{ totalPrice(sale).toFixed(2) }} $
                      </div>
                      <div
                        class="flex-grow text-blue-10 text-bold text-center"
                        style="flex: 1 1 auto; min-width: 0"
                      >
                        <q-icon name="mdi-piggy-bank" size="18px" class="q-mr-xs" />
                        {{ (totalPrice(sale) * exchangeRate).toFixed(0) }}
                      </div>
                      <div
                        class="flex-grow text-orange-10 text-right"
                        style="flex: 1 1 auto; min-width: 0"
                      >
                        <b>{{ $t('totalBV') }}:</b> {{ totalBV(sale).toFixed(2) }}
                      </div>
                    </div>
                  </q-card-section>

                  <q-separator />

                  <!-- Section 5: Actions -->
                  <q-card-section class="row justify-center items-center q-pt-xs q-pb-xs">
                    <div class="row justify-evenly items-center full-width q-gutter-xs wrap">
                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        color="orange"
                        label="Update"
                        icon="edit_note"
                        @click="
                          $router.push({ name: 'EditSale', params: { receiptno: sale.receiptno } })
                        "
                      />
                      <q-btn
                        v-if="isAdmin"
                        flat
                        no-caps
                        color="red"
                        icon="delete"
                        label="Delete"
                        @click="confirmDeleteReceipt(sale)"
                      />
                      <q-btn
                        flat
                        no-caps
                        :color="sale.status === 'pending' ? 'red' : 'green'"
                        :icon="sale.status === 'pending' ? 'check_circle' : 'warning'"
                        :label="sale.status === 'pending' ? $t('markCorrect') : $t('setPending')"
                        :disable="sale.status === 'pending' && !isAdmin"
                        @click="toggleStatus(sale)"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </template>
          <template v-if="form.reportType === 'bestCustomers'">
            <!-- Export -->

            <reportExporter
              reportType="bestCustomers"
              :reportData="sortedCustomers"
              :dpccode="form.dpccode"
              :startDate="form.startDate"
              :endDate="form.endDate"
            />

            <!-- Empty State -->
            <div v-if="!sortedCustomers.length" class="q-mt-lg">
              <q-banner dense rounded class="bg-grey-3 text-grey-8 text-center q-pa-sm">
                <q-icon name="info" color="primary" size="20px" class="q-mr-sm" />
                {{ $t('noRecordsFound') }}
              </q-banner>
            </div>

            <!-- Report Table -->
            <div v-else class="q-mt-md">
              <!-- Report Info Header -->
              <q-card flat bordered class="q-pa-md q-mb-md" style="border-radius: 20px">
                <div class="row justify-between">
                  <div>
                    <div>
                      <b>{{ $t('dateRange') }}:</b> {{ form.startDate }} — {{ form.endDate }}
                    </div>
                    <div>
                      <b>{{ $t('currentUser') }}:</b>
                      {{ auth.userDetails?.name || auth.userDetails?.firstname }}
                    </div>
                  </div>
                  <div>
                    <div><b>DPC:</b> {{ isAdmin ? form.dpccode : auth.userDetails?.dpc_id }}</div>
                  </div>
                </div>
              </q-card>

              <!-- 🏆 Best Customers Table -->
              <q-table
                :rows="sortedCustomers"
                :columns="columns"
                row-key="DistributorIDNO"
                flat
                bordered
                dense
                class="shadow-2 rounded-borders"
              >
                <!-- 🥇 Position Column -->
                <template v-slot:body-cell-position="props">
                  <q-td class="text-center text-bold">
                    {{ props.pageIndex + 1 }}
                  </q-td>
                </template>

                <!-- 🟢 Dot Column (BV Indicator) -->
                <template v-slot:body-cell-bvIndicator="props">
                  <q-td class="text-center">
                    <q-icon name="flag" :color="bvColor(props.row.TotalBV)" size="14px" />
                  </q-td>
                </template>

                <!-- TotalBV Column -->
                <template v-slot:body-cell-TotalBV="props">
                  <q-td class="text-right">
                    {{ Number(props.row.TotalBV).toFixed(2) }}
                  </q-td>
                </template>
              </q-table>
            </div>
          </template>

          <template v-if="summaryTotals">
            <div class="text-h6 text-bold text-white q-mb-sm">{{ summaryTotals.label }}</div>
            <!-- Daily Sales -->
            <div
              v-if="form.reportType === 'dailySales'"
              class="q-mb-sm row justify-end items-center"
            >
              <div class="text-subtitle1 text-bold text-white">Total Amount</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ convert(summaryTotals.totalAmount.toFixed(2)) }}</span>
              </div>
              <div class="q-ml-lg text-subtitle1 text-bold text-white">Total BV</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ summaryTotals.totalBv.toFixed(2) }}</span>
              </div>
            </div>

            <!-- Personal BV -->
            <div
              v-else-if="form.reportType === 'personalBV'"
              class="q-mb-sm row justify-end items-center"
            >
              <div class="text-subtitle1 text-bold text-white">Total Personal Sales</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">
                  {{ convert(Number(personalTotalSales || 0).toFixed(2)) }}
                </span>
              </div>
              <div class="q-ml-lg text-subtitle1 text-bold text-white">Total Personal BV</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ Number(personalTotalBV || 0).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Sales -->
            <div
              v-else-if="form.reportType === 'sales'"
              class="q-mb-sm row justify-end items-center"
            >
              <div class="text-subtitle1 text-bold text-white">Total Sales</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ convert(summaryTotals.totalSales.toFixed(2)) }}</span>
              </div>
            </div>

            <!-- Tallys -->
            <div
              v-else-if="form.reportType === 'tallys'"
              class="q-mb-sm row justify-end items-center"
            >
              <div class="text-subtitle1 text-bold text-white">Total Amount</div>
              <div class="currency-display text-bold text-light-green-14 q-ml-sm">
                <span class="amount">{{ convert(summaryTotals.totalAmount.toFixed(2)) }}</span>
              </div>
            </div>
          </template>
        </CurrencyToggle>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useAuth } from 'stores/auth'
import { useSaleStore } from '../stores/storeSales'
import { supabase } from 'boot/supabase'
import { useSalesStore } from '../stores/salesStore'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import DistributorSearch from 'components/DistributorSearch.vue'
import CurrencyToggle from '../components/currencyTogle.vue'
import reportExporter from 'src/components/ExporterComponent.vue'

// Optional: icon logic (you can keep it same or change)
//const bvIcon = (bv) => 'mdi-star-circle'

const auth = useAuth()
const salesStore = useSaleStore()
const store = useSalesStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const userRole = ref('')
const dpcOptions = ref([])
const editDialog = ref(false)
const editForm = ref({})
const tallyType = ref('daily') // default daily
const pendingCount = ref(0)
const pendingLoading = ref(false)

const fetchPendingCount = async () => {
  if (!form.dpccode || !form.startDate || !form.endDate) return

  pendingLoading.value = true

  try {
    const { count, error } = await supabase
      .from('salesheader')
      .select('*', { count: 'exact', head: true })
      .eq('dpccode', form.dpccode)
      .eq('status', 'pending')
      .gte('salesdate', form.startDate)
      .lte('salesdate', form.endDate)

    if (error) throw error

    pendingCount.value = count || 0
  } catch (err) {
    console.error('Pending count error:', err.message)
    pendingCount.value = 0
  } finally {
    pendingLoading.value = false
  }
}

// Pagination for monthly table
const monthPagination = ref({
  page: 1,
  rowsPerPage: 5, // default rows per page
  rowsNumber: 0, // total rows, will set dynamically
})

// Columns for monthly q-table
const monthlyColumns = [
  { name: 'productcode', label: 'Code', field: 'productcode', sortable: true, align: 'left' },
  { name: 'productname', label: 'Product', field: 'productname', sortable: true, align: 'left' },
  {
    name: 'totalQuantity',
    label: 'Quantity',
    field: 'totalQuantity',
    sortable: true,
    align: 'right',
  },
  {
    name: 'unitprice',
    label: 'Distributor Price',
    field: 'unitprice',
    sortable: true,
    align: 'right',
  },
  { name: 'totalBvs', label: 'BV', field: 'totalBvs', sortable: true, align: 'right' },
  { name: 'totalAmount', label: 'Amount', field: 'totalAmount', sortable: true, align: 'right' },
]

// Number formatting helper
//function convert(val) {
// return Number(val).toLocaleString()
//}
const tallyColumns = [
  {
    name: 'productcode',
    label: $t('Productcode'),
    field: 'productcode',
    sortable: true,
  },
  {
    name: 'productname',
    label: $t('ProductName'),
    field: 'productname',
    sortable: true,
    align: 'left',
    classes: 'ellipsis-col',
  },
  {
    name: 'quantity',
    label: $t('Quantity'),
    field: 'quantity',
    sortable: true,
    align: 'right',
  },
  {
    name: 'unitprice',
    label: $t('DistributorPrice'),
    field: 'unitprice',
    align: 'right',
  },
  {
    name: 'bvs',
    label: 'BV',
    field: 'bvs',
    align: 'right',
  },
  {
    name: 'amount',
    label: $t('Amount'),
    field: 'amount',
    align: 'right',
  },
]

const fromReceipt = ref('')
const toReceipt = ref('')

const getFirstDayOfMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}
// Get last day of current month
const getLastDayOfMonth = () => {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
}
const form = reactive({
  startDate: localStorage.getItem('reportStartDate') || getFirstDayOfMonth(),
  endDate: localStorage.getItem('reportEndDate') || getLastDayOfMonth(),
  dpccode: localStorage.getItem('reportDpccode') || '', // 🔹 load last selected DPC
  reportType: '',
  distributoridno: '',
})
// Current date & time
const currentDate = new Date().toLocaleString()

// radio selection
const stockFilter = ref('all')
const stock = ref([]) // raw stock from Supabase
const stockTotals = ref({
  totalDpValue: 0,
  totalBvValue: 0,
})

const fetchStock = async () => {
  if (!form.dpccode) {
    $q.notify({
      message: 'No DPC selected!',
      color: 'negative',
      icon: 'warning',
      position: 'top',
    })
    return
  }

  const tableName = `${form.dpccode}_STOCK`

  try {
    // 1) Fetch stock
    const { data: stockData, error: stockError } = await supabase
      .from(tableName)
      .select('productcode, productname, quantity')
      .order('productname', { ascending: true })

    if (stockError) throw stockError

    if (!stockData || !stockData.length) {
      stock.value = []
      stockTotals.value = { totalDpValue: 0, totalBvValue: 0 }
      return
    }

    // 2) Prepare reactivity (VERY IMPORTANT)
    // Create baseline with all fields so Vue tracks dpValue & bvValue
    stock.value = stockData.map((item) => ({
      productcode: item.productcode,
      productname: item.productname,
      quantity: Number(item.quantity) || 0,

      // predefine these fields for Vue reactivity
      distributorprice: 0,
      bvs: 0,
      dpValue: 0,
      bvValue: 0,
    }))

    // 3) Get productcodes
    const productCodes = stockData.map((i) => i.productcode)

    // 4) Fetch distributorprice & bvs from products table
    const { data: productsData, error: prodError } = await supabase
      .from('products')
      .select('productcode, distributorprice, bvs')
      .in('productcode', productCodes)

    if (prodError) throw prodError

    // 5) Build lookup
    const productLookup = {}
    productsData.forEach((p) => {
      productLookup[p.productcode] = p
    })

    // 6) Totals
    let totalDpValue = 0
    let totalBvValue = 0

    // 7) Merge into reactive stock array
    stock.value = stock.value.map((item) => {
      const productInfo = productLookup[item.productcode] || {}

      const distributorprice = Number(productInfo.distributorprice) || 0
      const bvs = Number(productInfo.bvs) || 0
      const qty = Number(item.quantity) || 0

      const dpValue = distributorprice * qty
      const bvValue = bvs * qty

      totalDpValue += dpValue
      totalBvValue += bvValue

      return {
        ...item,
        distributorprice,
        bvs,
        dpValue,
        bvValue,
      }
    })

    // 8) Save totals
    stockTotals.value = {
      totalDpValue,
      totalBvValue,
    }
  } catch (err) {
    console.error('fetchStock error:', err.message)
    stock.value = []
    stockTotals.value = { totalDpValue: 0, totalBvValue: 0 }
  }
}

// FILTER + SORT
const filteredStock = computed(() => {
  let result = stock.value

  if (stockFilter.value === 'above20') {
    result = result.filter((item) => item.quantity > 20)
  } else if (stockFilter.value === 'below5') {
    result = result.filter((item) => item.quantity < 5)
  }

  return result.sort((a, b) => a.quantity - b.quantity)
})

const permissions = computed(() => {
  const role = auth.userDetails?.role

  return {
    canSelectDpc: ['Admin', 'SuperAdmin', 'User2'].includes(role),
    isAdmin: ['Admin', 'SuperAdmin'].includes(role),
  }
})

const rowColor = (qty) => {
  if (qty <= 20) return 'row-red'
  if (qty <= 50) return 'row-orange'
  if (qty <= 100) return 'row-green'
  return ''
}

// -------------------------------------------
// WATCH DPC CODE → REFETCH WHEN IT CHANGES
// -------------------------------------------
watch(
  () => form.dpccode,
  async (newDpccode, oldDpccode) => {
    if (newDpccode && newDpccode !== oldDpccode) {
      await fetchStock()
    }
  },
)

watch(
  () => form.dpccode,
  (newVal) => {
    if (newVal) {
      localStorage.setItem('reportDpccode', newVal)
    }
  },
)

watch(
  () => [form.dpccode, form.startDate, form.endDate],
  () => {
    fetchPendingCount()
  },
  { immediate: true },
)
// FETCH STOCK ON MOUNTED
onMounted(async () => {
  const tableName = `${form.dpccode}_STOCK`

  const { data, error } = await supabase
    .from(tableName)
    .select('productcode, productname, quantity')
    .order('productname', { ascending: true })

  if (!error) {
    stock.value = data
  } else {
    console.error(error.message)
  }
})

const exchangeRate = computed(() => store.headerData.exchangeRate)
//const isAdmin = computed(() => ['Admin', 'SuperAdmin'].includes(auth.userDetails?.role))
const isAdmin = computed(() => ['Admin', 'SuperAdmin'].includes(auth.userDetails?.role))

// Status color mapping
const statusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'green-10'
    case 'complete':
      return 'orange-10'
    case 'correct':
      return 'light-green-14'
    default:
      return 'grey'
  }
}
// Computed totals for personal BV
const personalTotalSales = computed(() =>
  salesStore.sales.reduce(
    (acc, sale) =>
      acc + sale.salesdetails.reduce((sum, item) => sum + item.unitprice * item.quantity, 0),
    0,
  ),
)
// Personal BV total
const personalTotalBV = computed(() =>
  salesStore.sales.reduce(
    (acc, sale) =>
      acc + sale.salesdetails.reduce((sum, item) => sum + item.unitbv * item.quantity, 0),
    0,
  ),
)

// Access data from store
const sortedCustomers = computed(() => salesStore.bestCustomers || [])

const columns = [
  {
    name: 'position',
    label: '#',
    field: 'position',
    align: 'center',
    sortable: false,
  },
  {
    name: 'bvIndicator',
    label: '',
    field: 'bvIndicator',
    align: 'center',
    sortable: false,
  },
  {
    name: 'DistributorNames',
    label: 'Distributor',
    field: 'DistributorNames',
    align: 'left',
    sortable: true,
  },
  {
    name: 'DistributorTelephone',
    label: 'Telephone',
    field: 'DistributorTelephone',
    align: 'left',
  },
  {
    name: 'TotalBV',
    label: 'Total BV',
    field: 'TotalBV',
    align: 'right',
    sortable: true,
  },
]

const columns2 = [
  {
    name: 'productcode',
    label: 'Code',
    field: 'productcode',
    align: 'left',
    sortable: true,
  },
  {
    name: 'productname',
    label: 'Product',
    field: 'productname',
    align: 'left',
    sortable: true,
  },
  {
    name: 'quantity',
    label: 'Qty',
    field: 'quantity',
    align: 'center',
    sortable: true,
  },
  {
    name: 'dpValue',
    label: 'DP Value',
    field: (row) => row.dpValue.toFixed(2),
    align: 'right',
    sortable: true,
  },
  {
    name: 'bvValue',
    label: 'BV Value',
    field: (row) => row.bvValue.toFixed(2),
    align: 'right',
    sortable: true,
  },
]

// BV color logic
const bvColor = (bv) => {
  if (bv > 60) return 'green-8'
  if (bv > 20) return 'orange-8'
  return 'red-8'
}

// Watch user role changes
watch(
  () => auth.userDetails,
  (newVal) => {
    if (newVal) {
      userRole.value = newVal.dpc_id
    }
  },
  { immediate: true },
)
//Watch to clear distributor ID when report type changes
watch(
  () => form.reportType,
  (newVal) => {
    console.log('Report type changed to:', newVal)
    if (newVal === 'personalBV') {
      form.distributoridno = auth.userDetails?.idno || ''
    } else {
      form.distributoridno = ''
    }
  },
)
//watch to store dates in localStorage
watch(
  () => [form.startDate, form.endDate, form.dpccode],
  ([newStart, newEnd, newDpc]) => {
    localStorage.setItem('reportStartDate', newStart)
    localStorage.setItem('reportEndDate', newEnd)
    localStorage.setItem('reportDpccode', newDpc)
    console.log('Stored dpccode:', localStorage.getItem('reportDpccode'))
  },
)

// watch for reportType change
// Watch for report type changes and clear previous results
watch(
  () => form.reportType,
  (newVal) => {
    // Clear the underlying store data
    salesStore.sales = []
    salesStore.talliesRaw = []

    // Reset pagination
    currentPage.value = 1

    // Clear distributor ID if switching from personalBV
    if (newVal === 'personalBV') {
      form.distributoridno = auth.userDetails?.idno || ''
    } else {
      form.distributoridno = ''
    }
  },
)

// Responsive font size for products
const productFontSize = ref('14px')
onMounted(async () => {
  // --- Load exchange rate ---
  store.fetchExchangeRate()

  // --- Responsive font size ---
  const updateFontSize = () => {
    productFontSize.value = window.innerWidth < 400 ? '10px' : '14px'
  }
  updateFontSize()
  window.addEventListener('resize', updateFontSize)

  try {
    const role = auth.userDetails?.role
    const provinceCode = auth.userDetails?.province_code
    const userDpc = auth.userDetails?.dpc_id

    let data = []
    let error = null

    // --- Fetch DPCs based on role ---
    if (role === 'SuperAdmin') {
      ;({ data, error } = await supabase
        .from('shops')
        .select('shopcode, shop_name, province_code, country_code')
        .order('shop_name'))
    } else if (role === 'Admin' || role === 'User2') {
      ;({ data, error } = await supabase
        .from('shops')
        .select('shopcode, shop_name')
        .eq('province_code', provinceCode)
        .order('shop_name'))
    }

    if (error) throw error

    if (role === 'SuperAdmin' || role === 'Admin' || role === 'User2') {
      // Populate dropdown
      dpcOptions.value = (data || []).map((d) => ({
        label: d.shop_name,
        value: d.shopcode,
      }))

      // Preselect stored DPC if valid
      const storedDPC = localStorage.getItem('reportDpccode')
      if (storedDPC && dpcOptions.value.some((o) => o.value === storedDPC)) {
        form.dpccode = storedDPC
      } else {
        // Otherwise select first DPC by default
        form.dpccode = dpcOptions.value[0]?.value || ''
      }
    } else {
      // Regular user: only their DPC
      dpcOptions.value = [
        {
          label: auth.userDetails?.dpcname || 'My DPC',
          value: userDpc,
        },
      ]
      form.dpccode = userDpc
    }
  } catch (err) {
    console.error('Error loading DPCs:', err.message)
    $q.notify({
      type: 'negative',
      message: 'Failed to load DPCs: ' + err.message,
    })
  }
})

const fetchData = async () => {
  if (!form.startDate || !form.endDate) {
    $q.notify({ type: 'warning', message: 'Please select both start and end dates.' })
    return
  }

  try {
    const dpccodeToUse = permissions.value.canSelectDpc ? form.dpccode : auth.userDetails?.dpc_id

    if (!dpccodeToUse) {
      $q.notify({ type: 'negative', message: 'No DPC code available' })
      return
    }

    // Update store filters before fetching
    salesStore.setFilters({
      startDate: form.startDate,
      endDate: form.endDate,
      dpccode: dpccodeToUse,
    })

    switch (form.reportType) {
      case 'dailySales':
        await salesStore.fetchSales(form.startDate, form.endDate, dpccodeToUse)
        break

      case 'personalBV':
        if (!form.distributoridno) {
          $q.notify({ type: 'negative', message: 'Please enter a Distributor ID' })
          return
        }
        await salesStore.fetchPersonalSales(form.startDate, form.endDate, form.distributoridno)
        break

      case 'tallys':
      case 'sales':
        // simplified: fetch raw sales; aggregation will be done in component
        await salesStore.fetchSalesRaw(form.startDate, form.endDate, dpccodeToUse)
        break
      case 'stock':
        // simplified: fetch raw sales; aggregation will be done in component
        await fetchStock(dpccodeToUse)
        break

      case 'queriedSales':
        await salesStore.fetchQueriedSales(form.startDate, form.endDate, dpccodeToUse)
        break

      case 'bestCustomers':
        await salesStore.bestCustomer(form.startDate, form.endDate, dpccodeToUse)
        $q.notify({
          type: 'positive',
          message: 'Best customers loaded successfully.',
          timeout: 2000,
        })
        break

      default:
        console.warn('Unknown report type:', form.reportType)
        $q.notify({ type: 'warning', message: 'Unknown report type selected.' })
    }
  } catch (err) {
    console.error('Fetch error:', err)
    $q.notify({ type: 'negative', message: err.message || 'Error fetching data' })
  }
}

const shopName = computed(() => {
  if (!dpcOptions.value.length) return 'Loading...'

  // Find DPC name using form.dpccode (always set for Admins and Users)
  const currentDPC = dpcOptions.value.find((d) => d.value === form.dpccode)
  return currentDPC ? currentDPC.label : 'Unknown Shop'
})

// Daily tallies
const dailyTallies = computed(() => {
  const raw = salesStore.salesTally || []
  if (!raw.length) return []

  // Flatten all salesdetails with parent sale info
  const allItems = raw.flatMap((sale) =>
    (sale.salesdetails || []).map((item) => ({
      ...item,
      salesdate: sale.salesdate,
      receiptno: sale.receiptno,
      distributoridno: sale.distributoridno,
    })),
  )

  // Group by date
  const grouped = {}
  allItems.forEach((item) => {
    const date = item.salesdate
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(item)
  })

  return Object.entries(grouped).map(([date, items]) => ({ date, items }))
})

// Sales aggregated for pagination

// 🔹 Computed daily totals
const dailySalesTotals = computed(() => {
  if (!salesStore.salesTally || !salesStore.salesTally.length) return []

  const grouped = {}

  salesStore.salesTally.forEach((sale) => {
    // Normalize to YYYY-MM-DD (remove time part)
    const date = sale.salesdate.split('T')[0]

    if (!grouped[date]) grouped[date] = 0

    // Sum all items in this sale
    sale.salesdetails.forEach((item) => {
      grouped[date] += (item.quantity || 0) * (item.unitprice || 0)
    })
  })

  // Convert to sorted array
  return Object.entries(grouped)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
})
// Monthly tallies grouped by month and productcode
const monthlyTallies = computed(() => {
  const raw = salesStore.salesTally || []
  if (!raw.length) return []

  // Flatten all salesdetails
  const allItems = raw.flatMap((sale) =>
    (sale.salesdetails || []).map((item) => ({
      ...item,
      salesdate: sale.salesdate,
      receiptno: sale.receiptno,
      distributoridno: sale.distributoridno,
    })),
  )

  // 🔹 Aggregate by productcode ONLY (no month grouping)
  const productMap = {}

  allItems.forEach((item) => {
    const code = item.productcode

    if (!productMap[code]) {
      productMap[code] = {
        productcode: code,
        productname: item.productname,
        unitprice: item.unitprice || 0,
        totalQuantity: 0,
        totalAmount: 0,
        totalBvs: 0,
      }
    }

    productMap[code].totalQuantity += Number(item.quantity || 0)
    productMap[code].totalAmount += (item.unitprice || 0) * (item.quantity || 0)
    productMap[code].totalBvs += (item.bvs || 0) * (item.quantity || 0)
  })

  const products = Object.values(productMap)

  return [
    {
      // Label only (not grouping)
      month: `${form.startDate} → ${form.endDate}`,

      items: products,

      quantityTotal: products.reduce((s, p) => s + p.totalQuantity, 0),
      amountTotal: products.reduce((s, p) => s + p.totalAmount, 0),
      bvsTotal: products.reduce((s, p) => s + p.totalBvs, 0),
    },
  ]
})

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''

  const d = new Date(dateStr)

  const pad = (n) => (n < 10 ? '0' + n : n)

  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())

  return `${day}/${month}/${year}:${hours}:${minutes}:${seconds}`
}

const summaryTotals = computed(() => {
  if (form.reportType === 'dailySales') {
    // Sum across all receipts
    const totalAmount = paginatedSales.value.reduce((sum, sale) => sum + totalPrice(sale), 0)
    const totalBv = paginatedSales.value.reduce((sum, sale) => sum + totalBV(sale), 0)
    return { label: 'Daily Totals', totalAmount, totalBv }
  }

  if (form.reportType === 'personalBV') {
    return {
      label: 'Personal BV Totals',
      totalAmount: personalTotalSales,
      totalBv: personalTotalBV,
    }
  }

  if (form.reportType === 'sales') {
    const totalSales = dailySalesTotals.value.reduce((sum, d) => sum + d.total, 0)
    return { label: 'Sales Totals', totalSales }
  }

  if (form.reportType === 'tallys') {
    let totalAmount = 0
    if (tallyType.value === 'daily') {
      totalAmount = dailyTallies.value.reduce(
        (sum, day) => sum + day.items.reduce((s, i) => s + i.unitprice * i.quantity, 0),
        0,
      )
    } else if (tallyType.value === 'monthly') {
      totalAmount = monthlyTallies.value.reduce((sum, m) => sum + m.amountTotal, 0)
    }
    return { label: 'Tally Totals', totalAmount }
  }

  return {}
})

// Computed: group sales by distributor
const salesByDistributor = computed(() => {
  const groups = {}
  paginatedSales.value.forEach((sale) => {
    const distId = sale.distributoridno
    if (!groups[distId]) {
      groups[distId] = {
        distributoridno: distId,
        distributorname: sale.distributorname,
        distributorposition: sale.distributorposition,
        registereddpc: sale.registereddpc,
        lastmodified: sale.lastmodified,

        sales: [],
      }
    }
    groups[distId].sales.push(sale)
  })
  return Object.values(groups)
})

const allReports = computed(() => [
  { label: $t('PersonalBV'), value: 'personalBV' },
  { label: $t('dailySales'), value: 'dailySales' },
  { label: $t('tallies'), value: 'tallys' },
  { label: $t('sales'), value: 'sales' },
  { label: $t('mystock'), value: 'stock' },
  { label: $t('flaggedSales'), value: 'queriedSales' },
  { label: $t('bestCustomers'), value: 'bestCustomers' },
])
const reportOptions = computed(() => {
  if (isAdmin.value) {
    return allReports.value
  }
  return allReports.value.filter((r) =>
    [
      'personalBV',
      'dailySales',
      'tallys',
      'sales',
      'stock',
      'queriedSales',
      'bestCustomers',
    ].includes(r.value),
  )
})

// Computed totals
const totalPrice = (sale) => sale.salesdetails.reduce((acc, i) => acc + i.unitprice * i.quantity, 0)
const totalBV = (sale) => sale.salesdetails.reduce((acc, i) => acc + i.unitbv * i.quantity, 0)

// Action buttons (stub)

//const deleteSale = async (sale) => {
// try {
//   const { error } = await supabase.from('salesheader').delete().eq('receiptno', sale.receiptno)

// if (error) throw error

// update local state
// salesStore.sales = salesStore.sales.filter((s) => s.receiptno !== sale.receiptno)
//   return true
// } catch (err) {
//  console.error('Delete failed:', err.message)
//    throw err
// }
//}

const deleteSale = async (sale, dpccode, currentUser) => {
  if (!form.dpccode) {
    $q.notify({
      message: 'DPC code is not set! Cannot determine stock table.',
      color: 'red',
      position: 'top',
      icon: 'error',
    })
    return // stop the deletion
  }
  const stockTable = `${form.dpccode}_STOCK`
  //const stockTable = `${dpccode}_STOCK` // dynamic stock table
  try {
    // 1️⃣ Fetch the sale details
    const { data: saleDetails, error: fetchError } = await supabase
      .from('salesdetails')
      .select('productcode, quantity')
      .eq('receiptno', sale.receiptno)

    if (fetchError) throw fetchError

    // 2️⃣ Restore quantities to stock table
    for (const item of saleDetails) {
      // 1️⃣ Get current stock
      const { data: stockData, error: stockFetchError } = await supabase
        .from(stockTable)
        .select('quantity')
        .eq('productcode', item.productcode)
        .single()

      if (stockFetchError) throw stockFetchError

      // 2️⃣ Update quantity manually
      const newQuantity = (stockData.quantity || 0) + item.quantity
      const { error: stockError } = await supabase
        .from(stockTable)
        .update({
          quantity: newQuantity,
          lastmodified: new Date(),
          modifiedby: currentUser,
        })
        .eq('productcode', item.productcode)

      if (stockError) throw stockError
    }

    // 🔔 Notify that stock has been reversed
    $q.notify({
      message: 'Stock quantities restored successfully!',
      color: 'green',
      position: 'top',
      icon: 'inventory_2',
    })

    // 3️⃣ Delete sale details first
    const { error: detailsError } = await supabase
      .from('salesdetails')
      .delete()
      .eq('receiptno', sale.receiptno)
    if (detailsError) throw detailsError

    // 4️⃣ Delete sale header
    const { error: headerError } = await supabase
      .from('salesheader')
      .delete()
      .eq('receiptno', sale.receiptno)
    if (headerError) throw headerError

    // 🔔 Notify that receipt was deleted
    $q.notify({
      message: `Receipt ${sale.receiptno} deleted successfully!`,
      color: 'blue',
      position: 'top',
      icon: 'delete',
    })

    // 5️⃣ Update local store
    salesStore.sales = salesStore.sales.filter((s) => s.receiptno !== sale.receiptno)

    return true
  } catch (err) {
    console.error('Delete failed:', err.message)
    $q.notify({
      message: `Failed to delete sale: ${err.message}`,
      color: 'red',
      position: 'top',
      icon: 'error',
    })
    throw err
  }
}

const confirmDeleteReceipt = (sale) => {
  $q.dialog({
    title: $t('confirm'), // i18n key for "Confirm"
    message: $t('deleteReceiptMessage', { receipt: sale.receiptno }), // i18n key with interpolation
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteSale(sale)
      $q.notify({ type: 'positive', message: $t('receiptDeleted') })
    } catch (err) {
      $q.notify({ type: 'negative', message: err.message || $t('deleteFailed') })
    }
  })
}

// when button is clicked
const toggleStatus = (sale) => {
  const userRole = auth.userDetails?.role

  $q.dialog({
    title: $t('confirmAction'),
    message: $t('changeStatusMessage'),
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const updatedStatus = await salesStore.toggleStatus(sale.receiptno, sale.salesdate, userRole)
      sale.status = updatedStatus
      // 🔥 update counter instantly
      fetchPendingCount()

      $q.notify({
        type: 'positive',
        message: $t('statusUpdated', { status: updatedStatus }),
      })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.message || $t('updateFailed'),
      })
    }
  })
}

// Pagination state
const rowsPerPage = ref(5) // default 5
const currentPage = ref(1)

// Options for user
const pageOptions = [5, 10, 20, 50, 'All']

// Sort sales by receiptno
//const sortedSales = computed(() => {
// return [...salesStore.sales].sort((a, b) => {
// if receiptno is numeric
//  return Number(a.receiptno.replace(/\D/g, '')) - Number(b.receiptno.replace(/\D/g, ''))
// })
//})
const sortedSales = computed(() => {
  return [...salesStore.sales]
    .filter((sale) => {
      // Convert receiptno to numeric for comparison
      const saleNo = Number(sale.receiptno.replace(/\D/g, ''))

      const fromNo = fromReceipt.value ? Number(fromReceipt.value.replace(/\D/g, '')) : null
      const toNo = toReceipt.value ? Number(toReceipt.value.replace(/\D/g, '')) : null

      if (fromNo !== null && saleNo < fromNo) return false
      if (toNo !== null && saleNo > toNo) return false
      return true
    })
    .sort((a, b) => {
      return Number(a.receiptno.replace(/\D/g, '')) - Number(b.receiptno.replace(/\D/g, ''))
    })
})

// Apply pagination
const paginatedSales = computed(() => {
  if (rowsPerPage.value === 'All') {
    return sortedSales.value
  }
  const start = (currentPage.value - 1) * rowsPerPage.value
  const end = start + rowsPerPage.value
  return sortedSales.value.slice(start, end)
})

// Total pages
const totalPages = computed(() => {
  if (rowsPerPage.value === 'All') return 1
  return Math.ceil(sortedSales.value.length / rowsPerPage.value)
})

// Change page safely
function changePage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const submitUpdate = async () => {
  try {
    await salesStore.updateSale(editForm.value)
    $q.notify({
      type: 'positive',
      message: $t('saleUpdated'), // i18n key
    })
    editDialog.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || $t('updateFailed'), // i18n key
    })
  }
}
</script>

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
  border-radius: 4px;
  background-color: #263238; /* matches Quasar bg-blue-grey-10 */
  color: white;
  text-align: center;
  appearance: none;
  box-sizing: border-box;
  max-width: 100%; /* prevent overflow */
}
.pagination-select {
  background-color: #4caf50; /* Dark background */
  border-radius: 4px; /* Rounded corners */
}

/* Control the height */
.pagination-select .q-field__control {
  min-height: 38px; /* Adjust as needed */
  height: 38px;
}

/* White label + dropdown icon */
.pagination-select .q-field__label,
.pagination-select .q-icon {
  color: white !important;
}

/* White text inside the input */
.pagination-select .q-field__native {
  color: white !important;
}

/* White border when outlined */
.pagination-select .q-field__control {
  border-color: #4caf50 !important;
}

.custom-select option {
  background-color: transparent; /* matches Quasar bg-blue-grey-10 */
  color: white;
}

.custom-select:focus {
  outline: none;
  border-color: #0d47a1;
}
.native-select {
  width: 120px;
  background-color: #263238;
  color: white; /* white text */
  border: 1px solid white; /* white outline */
  border-radius: 6px; /* rounded corners */
  padding: 8px; /* inner spacing */
  height: 38px; /* CONTROL HEIGHT */
  appearance: none; /* remove default arrow */
  -moz-appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

/* Optional: add custom dropdown arrow on the right (cleaner UI) */
.native-select {
  background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='16' viewBox='0 0 24 24' width='16' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.table-responsive {
  overflow-x: auto;
}

.wrap-text {
  white-space: normal;
  word-break: break-word;
  max-width: 200px;
}
.stock-table .product-wrap {
  white-space: normal !important;
  line-height: 1.2em;
  max-height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-table th,
.stock-table td {
  border: 1px solid #e0e0e0 !important;
}

/* Product wrapping max 2 lines then truncate */
.product-wrap {
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* show only 2 lines */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

/* Row colors depending on quantity */
.row-red td {
  color: #ff5252 !important;
}

.row-orange td {
  color: #ff9800 !important;
}

.row-green td {
  color: #4caf50 !important;
}

/* Apply to all outlined inputs/selects inside your form */
.custom-form ::v-deep(.q-field--outlined .q-field__control) {
  border: 1px solid #5eee42 !important; /* darker border */
  border-radius: 4px; /* optional: smoother edges */
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
.responsive-card {
  width: 100%;
  max-width: 95vw; /* dynamic width */
  margin: 0 auto;
}

/* Large screens */
@media (min-width: 1600px) {
  .responsive-card {
    max-width: 1600px;
  }
}

/* Mobile */
@media (max-width: 600px) {
  .responsive-card {
    max-width: 100%;
    padding: 8px;
  }
}
</style>
