<template>
  <q-page class="flex flex-center q-pa-none">
    <q-card
      class="q-pa-sm bg-transparent"
      style="max-width: 800px; width: 100%; border: 0; box-shadow: none"
    >
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
            <div class="text-h6 text-white text-bold">{{ shopName }}</div>
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
            <select v-model="form.reportType" class="custom-select full-width text-center">
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
      </q-card-section>

      <q-card-section class="custom-form">
        <!-- DPC select / input -->
        <div
          class="col-12 col-md-3"
          v-if="
            ['dailySales', 'tallys', 'sales', 'queriedSales', 'bestCustomers'].includes(
              form.reportType,
            )
          "
        >
          <div class="text-caption text-bold text-white text-bold q-mb-xs">Shop</div>
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
            class="q-mt-md"
            input-class="text-center text-white text-bold"
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

      <q-card-section class="custom-form">
        <!-- Loading GIF -->
        <div v-if="salesStore.loading" class="q-mt-md flex flex-center">
          <q-spinner-hourglass color="light-green" size="50px" />
        </div>
        <div v-if="salesStore.error" class="text-orange q-mt-md">{{ salesStore.error }}</div>

        <!-- Controls -->
        <div class="row items-center q-gutter-md q-mb-md">
          <q-select
            v-model="rowsPerPage"
            :options="pageOptions"
            label="Rows per page"
            dense
            outlined
            style="width: 120px"
          />

          <q-btn
            flat
            round
            icon="arrow_back"
            text-color="white"
            @click="changePage(currentPage - 1)"
            :disable="currentPage === 1"
          />
          <div class="text-white">Page {{ currentPage }} / {{ totalPages }}</div>
          <q-btn
            flat
            round
            icon="arrow_forward"
            text-color="white"
            @click="changePage(currentPage + 1)"
            :disable="currentPage === totalPages"
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
                    <div class="text-subtitle2 text-bold text-green-14">
                      <b>{{ $t('receiptNo') }}:</b> {{ sale.receiptno }}
                    </div>
                    <div class="text-subtitle2">
                      <b>SaleDate:</b> {{ formatDateTime(sale.salesdate) }}
                    </div>
                  </q-card-section>

                  <!-- Section 2: Distributor info & status -->
                  <q-card-section class="row justify-between items-center q-pt-xs q-pb-xs">
                    <div class="column">
                      <div>
                        <b>{{ $t('distributorID') }}:</b> {{ sale.distributoridno }}
                      </div>
                      <div class="text-red-9 text-bold">
                        <b>Name:</b> {{ sale.distributorname || 'Fetching...' }}
                      </div>
                      <div class="text-orange-14">
                        {{ $t('lastmodified') }}:{{ formatDateTime(sale.lastmodified) }}
                      </div>
                    </div>
                    <div>
                      <q-chip :color="statusColor(sale.status)" text-color="white" class="q-mb-xs">
                        {{ sale.status }}
                      </q-chip>
                      By:<q-chip
                        :color="statusColor(sale.status)"
                        text-color="white"
                        class="q-mb-xs"
                      >
                        {{ sale.createdby || 'Unknown' }}
                      </q-chip>
                      <div
                        :style="{
                          backgroundColor: statusColor(sale.status),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          marginBottom: '4px',
                        }"
                      >
                        {{ sale.createdby || 'Unknown' }}
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
                        :label="sale.status === 'pending' ? 'Set Complete' : 'Set Pending'"
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
                  <q-card-section class="q-pa-sm">
                    <div class="row q-col-gutter-sm">
                      <!-- Column 1: Distributor Info -->
                      <div class="col-12 col-sm-6 col-lg-4">
                        <!-- Distributor ID & DPC -->
                        <div class="text-caption">
                          <b class="text-orange">{{ $t('DistributorId') }}:</b>
                          {{ group.distributoridno }}
                        </div>
                        <div class="text-caption">
                          <b>DPC:</b> {{ group.registereddpc || 'Fetching...' }}
                        </div>
                        <!-- Distributor Name -->
                        <div class="text-caption q-mt-xs">
                          <b>{{ $t('DistributorName') }}:</b>
                          <span class="text-bold text-ellipsis">
                            {{ group.distributorname || 'Fetching...' }}
                          </span>
                        </div>
                      </div>

                      <!-- Column 2: Receipt & Date -->
                      <div class="col-12 col-sm-6 col-lg-4">
                        <div class="text-subtitle2 text-bold text-green-14">
                          <b>{{ $t('receiptNo') }}:</b> {{ sale.receiptno }}
                        </div>
                        <div class="text-caption q-mt-xs">
                          <b>Date:</b> {{ formatDateTime(sale.salesdate) }}
                        </div>
                      </div>

                      <!-- Column 3: Rank & Status -->
                      <div class="col-12 col-sm-6 col-lg-4">
                        <div class="text-caption">
                          <b>Rank:</b> {{ group.distributorposition || 'Fetching...' }}
                        </div>
                        <div class="q-mt-sm">
                          <q-chip
                            :color="statusColor(sale.status)"
                            text-color="white"
                            class="text-caption"
                          >
                            {{ sale.status }}
                          </q-chip>
                          By:<q-chip
                            :color="statusColor(sale.status)"
                            text-color="white"
                            class="q-mb-xs"
                          >
                            {{ sale.createdby || 'Unknown' }}
                          </q-chip>
                        </div>
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
                :extraInfo="{ tallyType }"
              />
            </q-card>

            <!-- Daily view -->
            <div v-if="tallyType === 'daily'">
              <div v-if="!dailyTallies.length" class="text-center text-red q-mt-md">
                {{ $t('NoTallies') }}
              </div>

              <q-card
                v-else
                v-for="day in dailyTallies"
                :key="day.date"
                flat
                bordered
                class="q-mb-md full-width bg-transparent"
              >
                <!-- Products table -->
                <q-card-section>
                  <div class="table-responsive">
                    <table class="q-table q-mb-sm bg-white" style="width: 100%">
                      <thead>
                        <tr>
                          <th colspan="7" class="text-left text-black text-bold">
                            {{ formatDateTime(day.date) }}
                          </th>
                        </tr>
                        <tr class="text-bold">
                          <th>{{ $t('Productcode') }}</th>
                          <th>{{ $t('ProductName') }}</th>
                          <th>{{ $t('Quantity') }}</th>
                          <th>{{ $t('DistributorPrice') }}</th>
                          <th>BV</th>
                          <th>{{ $t('Amount') }}</th>
                        </tr>
                        <!-- Separator line -->
                        <tr>
                          <th colspan="7" style="padding: 0">
                            <hr style="border: 1px solid #000; margin: 0" />
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr v-for="item in day.items" :key="item.productcode">
                          <td>{{ item.productcode }}</td>
                          <td>{{ item.productname }}</td>
                          <td class="text-bold text-blue-9">{{ item.quantity }}</td>
                          <td>{{ item.unitprice.toFixed(2) }}</td>

                          <td>
                            {{ (item.bvs * item.quantity).toFixed(2) }}
                          </td>
                          <td>
                            {{ convert((item.unitprice * item.quantity).toFixed(2)) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="bg-grey-3 text-bold">
                          <td colspan="3" class="text-right">
                            Total for {{ formatDateTime(day.date) }}:
                          </td>
                          <td class="text-bold">
                            Prdts:{{ day.items.reduce((sum, i) => sum + i.quantity, 0) }}
                          </td>
                          <td>
                            {{
                              day.items.reduce((sum, i) => sum + i.bvs * i.quantity, 0).toFixed(2)
                            }}
                          </td>
                          <td>
                            {{
                              convert(
                                day.items
                                  .reduce((sum, i) => sum + i.unitprice * i.quantity, 0)
                                  .toFixed(2),
                              )
                            }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </q-card-section>
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

                  <div class="table-responsive">
                    <table class="q-table q-mb-sm" style="width: 100%">
                      <thead>
                        <tr class="bg-grey-2 text-bold">
                          <th>{{ $t('Productcode') }}</th>
                          <th>{{ $t('ProductName') }}</th>
                          <th>{{ $t('Quantity') }}</th>
                          <th>{{ $t('DistributorPrice') }}</th>
                          <th>BV</th>
                          <th>{{ $t('Amount') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in monthItem.items"
                          :key="item.productcode"
                          class="hover:bg-grey-1"
                        >
                          <td>{{ item.productcode }}</td>
                          <td>{{ item.productname }}</td>
                          <td class="text-center">
                            <q-badge
                              color="light-green-14 text-black text-bold"
                              class="flex items-center justify-center text-bold"
                              style="
                                font-size: 13px;
                                min-width: 40px;
                                height: 28px;
                                border-radius: 8px;
                              "
                            >
                              {{ item.totalQuantity }}
                            </q-badge>
                          </td>
                          <td>{{ convert((item.unitprice || 0).toFixed(0)) }}</td>
                          <td>{{ item.totalBvs.toFixed(2) }}</td>

                          <td>{{ convert(item.totalAmount.toFixed(2)) }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="bg-grey-3 text-bold">
                          <td colspan="4" class="text-right">Month Totals:</td>
                          <td>{{ monthItem.quantityTotal }}</td>
                          <td>{{ convert(monthItem.amountTotal.toFixed(0)) }}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </q-card-section>
              </q-card>

              <!-- Grand Totals across all months -->
              <q-card flat bordered class="q-mt-md bg-grey-2">
                <q-card-section>
                  <div class="text-right text-bold">
                    <span class="q-mr-md">Grand Quantity:</span>
                    <q-badge color="green" class="q-pa-xs text-bold">
                      {{ monthlyTallies.reduce((sum, m) => sum + m.quantityTotal, 0) }}
                    </q-badge>

                    <span class="q-ml-md q-mr-md">Grand Amount:</span>
                    <span class="text-primary">
                      {{
                        convert(
                          monthlyTallies.reduce((sum, m) => sum + m.amountTotal, 0).toFixed(2),
                        )
                      }}
                    </span>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>

          <template v-else-if="form.reportType === 'sales'">
            <q-card flat bordered class="q-mb-md bg-grey-1">
              <reportExporter reportType="sales" :reportData="dailySalesTotals" />
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
          <template v-if="form.reportType === 'queriedSales'">
            <!-- Exporter -->
            <reportExporter reportType="dailySales" :reportData="paginatedSales" />

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
          <template v-if="form.reportType === 'bestCustomers'">
            <!-- Export Button -->
            <reportExporter reportType="bestCustomers" :reportData="sortedCustomers" />

            <div v-if="!sortedCustomers.length" class="q-mt-lg">
              <q-banner dense rounded class="bg-grey-3 text-grey-8 text-center q-pa-sm">
                <q-icon name="info" color="primary" size="20px" class="q-mr-sm" />
                {{ $t('noRecordsFound') }}
              </q-banner>
            </div>

            <div v-else class="q-mt-md">
              <!-- Report Info -->
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

              <!-- Customers Table -->
              <q-table
                :rows="sortedCustomers"
                :columns="columns"
                row-key="DistributorIDNO"
                flat
                bordered
                dense
                class="shadow-2 rounded-borders"
              >
                <!-- Position Column -->
                <template v-slot:body-cell-position="props">
                  <q-td class="row items-center">
                    <span class="q-mr-sm">{{ props.pageIndex + 1 }}</span>
                    <q-icon name="mdi-circle" :color="bvColor(props.row.TotalBV)" size="12px" />
                  </q-td>
                </template>

                <!-- TotalBV Column -->
                <template v-slot:body-cell-totalBV="props">
                  <q-td>{{ Number(props.row.TotalBV).toFixed(2) }}</q-td>
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

// Icon color logic

const bvColor = (bv) => {
  if (bv > 60) return 'green'
  if (bv > 20) return 'orange'
  return 'red'
}

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
  reportType: 'dailySales',
  distributoridno: '',
})
// Current date & time
const currentDate = new Date().toLocaleString()

const exchangeRate = computed(() => store.headerData.exchangeRate)
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

// Sort BV descending
const sortedCustomers = computed(() =>
  [...salesStore.bestCustomers].sort((a, b) => b.totalBV - a.totalBV),
)

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
      ;({ data, error } = await supabase.from('dpc').select('dpccode, dpcname').order('dpcname'))
    } else if (role === 'Admin') {
      ;({ data, error } = await supabase
        .from('dpc')
        .select('dpccode, dpcname')
        .eq('province', provinceCode)
        .order('dpcname'))
    }

    if (error) throw error

    if (role === 'SuperAdmin' || role === 'Admin') {
      // Populate dropdown
      dpcOptions.value = (data || []).map((d) => ({
        label: d.dpcname,
        value: d.dpccode,
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
    const dpccodeToUse = isAdmin.value ? form.dpccode : auth.userDetails?.dpc_id

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

  // Flatten salesdetails
  const allItems = raw.flatMap((sale) =>
    (sale.salesdetails || []).map((item) => ({
      ...item,
      salesdate: sale.salesdate,
      receiptno: sale.receiptno,
      distributoridno: sale.distributoridno,
    })),
  )

  // Group by month
  const monthlyGroups = {}
  allItems.forEach((item) => {
    const month = item.salesdate.slice(0, 7) // YYYY-MM
    if (!monthlyGroups[month]) monthlyGroups[month] = []
    monthlyGroups[month].push(item)
  })

  // For each month, group by productcode and calculate totals
  return Object.entries(monthlyGroups).map(([month, items]) => {
    const products = Object.values(
      items.reduce((acc, item) => {
        const code = item.productcode
        if (!acc[code]) {
          acc[code] = {
            productcode: code,
            productname: item.productname,
            unitprice: item.unitprice || 0, // ✅ keep one unit price
            totalQuantity: 0,
            totalAmount: 0,
            totalBvs: 0,
          }
        }
        acc[code].totalQuantity += Number(item.quantity || 0)
        acc[code].totalAmount += (item.unitprice || 0) * (item.quantity || 0)
        acc[code].totalBvs += (item.bvs || 0) * (item.quantity || 0)
        return acc
      }, {}),
    )

    return {
      month,
      items: products,
      quantityTotal: products.reduce((sum, p) => sum + p.totalQuantity, 0),
      amountTotal: products.reduce((sum, p) => sum + p.totalAmount, 0),
      bvsTotal: products.reduce((sum, p) => sum + p.totalBvs, 0),
    }
  })
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
  { label: $t('flaggedSales'), value: 'queriedSales' },
  { label: $t('bestCustomers'), value: 'bestCustomers' },
])
const reportOptions = computed(() => {
  if (isAdmin.value) {
    return allReports.value
  }
  return allReports.value.filter((r) =>
    ['personalBV', 'dailySales', 'tallys', 'sales', 'queriedSales', 'bestCustomers'].includes(
      r.value,
    ),
  )
})

// Computed totals
const totalPrice = (sale) => sale.salesdetails.reduce((acc, i) => acc + i.unitprice * i.quantity, 0)
const totalBV = (sale) => sale.salesdetails.reduce((acc, i) => acc + i.unitbv * i.quantity, 0)

// Action buttons (stub)

const deleteSale = async (sale) => {
  try {
    const { error } = await supabase.from('salesheader').delete().eq('receiptno', sale.receiptno)

    if (error) throw error

    // update local state
    salesStore.sales = salesStore.sales.filter((s) => s.receiptno !== sale.receiptno)
    return true
  } catch (err) {
    console.error('Delete failed:', err.message)
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
const pageOptions = [5, 15, 'All']

// Sort sales by receiptno
const sortedSales = computed(() => {
  return [...salesStore.sales].sort((a, b) => {
    // if receiptno is numeric
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
