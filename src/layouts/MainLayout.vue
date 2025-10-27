<template>
  <q-layout view="hHh lpR fFf" class="q-safe-area">
    <!-- Minimal Transparent Header -->
    <q-header class="bg-blue-grey-10 text-white q-safe-area-top" elevated height-hint="95">
      <div class="row items-center justify-between q-pa-sm" style="height: 80px; padding-top: 35px">
        <!-- Left: Logo / Title -->
        <div class="row items-center no-wrap q-gutter-sm">
          <q-avatar size="36px" class="bg-green-14">
            <q-icon name="shopping_cart" class="text-white" size="20px" />
          </q-avatar>
          <div
            class="text-subtitle2 text-weight-bold q-ml-xs"
            style="font-size: clamp(14px, 4vw, 16px); white-space: nowrap"
          >
            <span class="text-light-green-14">Dyna</span>
            <span class="text-white">Shop</span>
            <div class="text-caption text-grey-1">{{ $t('slogan') }}</div>
          </div>
        </div>

        <!-- Right: User Avatar + Name + Status -->
        <div class="row items-center no-wrap q-gutter-sm">
          <!-- Name & Status (Left of Avatar) -->
          <div
            class="column justify-center text-right"
            style="max-width: 120px; white-space: nowrap"
          >
            <span
              v-if="auth.userDetails"
              class="text-subtitle2 text-light-green-14 text-weight-medium"
              style="font-size: clamp(13px, 3vw, 16px); text-overflow: ellipsis; overflow: hidden"
            >
              {{ auth.userDetails.firstname }}
              <span class="text-grey-1 text-weight-bold">
                {{ auth.userDetails.lastname }}
              </span>
            </span>
            <span class="text-caption text-grey-1" style="font-size: clamp(8px, 1.5vw, 12px)">
              {{ $t('online') }}
            </span>
          </div>

          <!-- Avatar -->
          <q-avatar size="36px" class="cursor-pointer">
            <img
              src="https://img.freepik.com/premium-vector/person-with-blue-shirt-that-says-name-person_1029948-7040.jpg"
              alt="User Avatar"
            />
          </q-avatar>

          <!-- Menu -->
          <q-menu anchor="bottom right" self="top right">
            <template v-slot:activator="props">
              <q-btn round dense flat icon="more_vert" color="white" v-bind="props" />
            </template>
            <q-list style="min-width: 150px" class="bg-grey-1 text-dark">
              <q-item clickable v-close-popup @click="goToProfile">
                <q-item-section avatar><q-icon name="person" /></q-item-section>
                <q-item-section>{{ $t('manageProfile') }}</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar><q-icon name="logout" color="red" /></q-item-section>
                <q-item-section class="text-red">{{ $t('logout') }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
    </q-header>

    <!-- Page Content -->
    <q-page-container :style="wallpaperStyle" class="q-pa-sm">
      <router-view />

      <!-- Floating Buttons (INSIDE page, just below header, left corner) -->
      <!-- Floating Buttons (INSIDE page, just below header, right corner) -->
      <!-- Floating Buttons (INSIDE page, just below header, right corner) -->
      <div
        class="row items-center no-wrap"
        style="position: absolute; top: 120px; right: 40px; z-index: 1000; gap: 8px"
      >
        <!-- Language Toggle with Label -->
        <div class="relative-position">
          <q-btn dense round flat color="white" size="lg" icon="language" @click="toggleLanguage" />

          <!-- Small label positioned above button -->
          <div
            class="absolute text-caption text-white bg-red-6 flex flex-center"
            style="
              top: -4px;
              right: -4px;
              font-size: 10px;
              min-width: 18px;
              height: 18px;
              border-radius: 50%;
            "
          >
            {{ currentLanguage }}
          </div>
        </div>

        <!-- Speed Dial for Tabs -->
        <q-fab
          v-model="fabOpen"
          icon="menu"
          active-icon="close"
          color="white"
          text-color="blue-grey-10"
          direction="down"
          size="30px"
        >
          <q-fab-action
            label-position="right"
            icon="storefront"
            @click="goToSales"
            color="blue-grey-10"
            :text-color="activeTab === 'sales' ? 'light-green-14' : 'white'"
            :label="$t('fabSales')"
            class="fab-action-uniform"
          />

          <q-fab-action
            label-position="right"
            icon="fact_check"
            @click="goToReports"
            color="blue-grey-10"
            :text-color="activeTab === 'reports' ? 'light-green-14' : 'white'"
            :label="$t('fabReports')"
            class="fab-action-uniform"
          />

          <q-fab-action
            v-if="isAdmin"
            label-position="right"
            icon="outbound"
            @click="goToStock"
            color="blue-grey-10"
            :text-color="activeTab === 'stock' ? 'light-green-14' : 'white'"
            label="Stock"
            class="fab-action-uniform"
          />
          <q-fab-action
            v-if="isAdmin"
            label-position="right"
            icon="outbound"
            @click="goToAdmin"
            color="blue-grey-10"
            :text-color="activeTab === 'stock' ? 'light-green-14' : 'white'"
            label="Admin"
            class="fab-action-uniform"
          />
        </q-fab>
      </div>
    </q-page-container>
    <!-- Transparent Footer -->
    <q-footer class="bg-blue-grey-10 text-white q-safe-area-bottom" elevated>
      <div
        class="row items-center justify-between q-pl-sm q-pr-sm q-pt-sm"
        style="min-height: 85px; padding-bottom: 20px"
      >
        <!-- Left: Copyright -->
        <div class="row items-center q-gutter-sm">
          <q-icon name="copyright" size="20px" class="text-white" />
          <div class="text-subtitle2">
            <span class="text-light-green-14">Alvin</span>
            <span class="text-white">Concepts</span>
          </div>
        </div>

        <!-- Current Page Title + Logout -->
        <div class="row items-center q-gutter-sm">
          <!-- Page title -->
          <div class="text-subtitle2 text-white q-mr-md">
            {{ pageTitle }}
          </div>

          <!-- Logout button -->
          <q-btn
            dense
            round
            flat
            color="white"
            icon="exit_to_app"
            class="hover-scale"
            @click="logout"
          />
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from 'stores/auth'
import { useRouter } from 'vue-router'
const isAdmin = computed(() => ['Admin', 'SuperAdmin'].includes(auth.userDetails?.role))
const auth = useAuth()
import { useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
const { t: $t } = useI18n()
const fabOpen = ref(false)
const { locale } = useI18n()

import wallpaperUrl from '../assets/124409.jpg'
const wallpaperStyle = {
  backgroundImage: `url(${wallpaperUrl})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  minHeight: '100dvh', // dynamic viewport height (safe for mobile)
}
const pageTitle = computed(() => {
  switch (route.name) {
    case 'home':
      return $t('home')
    case 'sales':
      return $t('salesPage')
    case 'reports':
      return $t('reportsPage')
    case 'stock':
      return $t('stock')
    case 'profile':
      return $t('profile')
    default:
      return route.name || ''
  }
})
// Compute the current page title
//const pageTitle = computed(() => pageTitles[route.name] || route.name || '')
const goToProfile = () => router.push('/manage-profile')
const toggleLanguage = () => {
  locale.value = locale.value === 'fr' ? 'en' : 'fr'
  localStorage.setItem('lang', locale.value)
}

function resetTimer() {
  auth.resetInactivityTimer()
}

// Computed label for display
const currentLanguage = computed(() => (locale.value === 'fr' ? 'FR' : 'EN'))
const logout = async () => {
  await auth.logout()
  window.location.href = '/'
}
const activeTab = ref('sales')
const goToSales = () => {
  activeTab.value = 'sales'
  router.push({ name: 'Home' })
}
const goToReports = () => {
  activeTab.value = 'reports'
  router.push({ name: 'reports' })
}
const goToStock = () => {
  activeTab.value = 'stock'
  router.push({ name: 'stock' })
}
const goToAdmin = () => {
  activeTab.value = 'admin'
  router.push({ name: 'admin' })
}

onMounted(async () => {
  auth.loadFromLocalStorage()
  await auth.fetchUser()

  if (!auth.user) {
    router.replace('/')
  } else {
    auth.startInactivityTimer()
    // Override the logout function to include redirect
    const originalLogout = auth.logout
    auth.logout = async (showMessage = false) => {
      await originalLogout(showMessage)
      router.replace('/') // redirect after logout
    }
  }

  window.addEventListener('mousemove', resetTimer)
  window.addEventListener('keydown', resetTimer)
  window.addEventListener('click', resetTimer)
  window.addEventListener('touchstart', resetTimer)
})

onBeforeUnmount(() => {
  // ✅ Clean up event listeners
  window.removeEventListener('mousemove', resetTimer)
  window.removeEventListener('keydown', resetTimer)
  window.removeEventListener('click', resetTimer)
  window.removeEventListener('touchstart', resetTimer)
})
</script>
<style scoped>
.fab-action-uniform {
  min-width: 120px; /* ensures all FAB actions have the same width */
  justify-content: flex-start; /* aligns icon and label nicely */
}
.custom-header {
  height: 80px; /* make taller */
  margin-bottom: 16px; /* space below header */
  background: transparent; /* fully transparent */
  backdrop-filter: blur(6px); /* subtle blur effect */
  font-family: 'Epunda Slab', serif;
  font-optical-sizing: auto;
  font-weight: bold;
  font-style: normal;
  margin-bottom: 16px; /* keeps content from overlapping header */
}

/* Ensure row items never wrap */
.custom-header .row.items-center {
  flex-wrap: nowrap;
}

/* Ellipsis for long names */
.ellipsis {
  max-width: 150px; /* adjust as needed */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive font sizes */
@media (max-width: 600px) {
  .custom-header .text-h6 {
    font-size: 14px; /* smaller font on small screens */
  }

  .custom-header span.text-red-7 {
    font-size: 14px; /* keep ratio with main text */
  }

  .custom-header .q-avatar {
    width: 28px;
    height: 28px;
  }

  .custom-header .q-icon {
    width: 20px;
    height: 20px;
  }

  .custom-header .ellipsis {
    max-width: 100px; /* shrink allowed width */
  }
}
</style>
