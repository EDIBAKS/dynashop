<template>
  <q-page class="flex flex-center" :style="wallpaperStyle">
    <div class="q-pa-md" style="width: 100%; max-width: 480px">
      <q-card
        class="q-pa-md bg-transparent custom-form"
        style="width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)"
        @mouseover="hover = true"
        @mouseleave="hover = false"
        :class="{ hovered: hover }"
      >
        <!-- Logo / Header -->
        <div class="text-center q-mb-lg">
          <q-icon name="shopping_cart" class="text-light-green-14" size="56px" />
          <div class="text-h5 text-weight-bold q-mt-sm">
            <span class="text-light-green-14">Dyna</span><span class="text-white">Shop</span>
          </div>
        </div>

        <!-- Email Input -->
        <!-- Email Input -->
        <div class="q-mb-sm">
          <div class="text-caption text-white q-mb-xs">{{ $t('email') }}</div>
          <q-input
            v-model="email"
            type="email"
            outlined
            dense
            rounded
            class="white-input"
            input-class="text-white text-center"
            style="height: 44px"
          />
        </div>

        <!-- Password Input -->
        <div class="q-mb-sm">
          <div class="text-caption text-white q-mb-xs">{{ $t('password') }}</div>
          <q-input
            v-model="password"
            type="password"
            outlined
            dense
            rounded
            class="white-input"
            input-class="text-white text-center"
            style="height: 44px"
          />
        </div>
        <!-- Login Button -->
        <q-btn
          :label="$t('login')"
          @click="login"
          class="full-width q-mt-md bg-light-green-14 text-white"
          style="height: 44px; border-radius: 22px"
        />
      </q-card>
    </div>
    <!-- ✅ Bottom-left footer content -->
    <div
      class="row items-center q-gutter-sm text-white"
      style="position: absolute; bottom: 31px; left: 16px; z-index: 10; opacity: 0.9"
    >
      <q-icon name="copyright" size="20px" class="text-white" />
      <div class="text-subtitle2">
        <span class="text-light-green-14">Alvin</span>
        <span class="text-white">Concepts</span>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuth } from 'stores/auth'
import { useI18n } from 'vue-i18n'
import wallpaperUrl from '../assets/124409.jpg'

const wallpaperStyle = {
  backgroundImage: `url(${wallpaperUrl})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundAttachment: 'fixed',
  minHeight: '100vh',
  padding: '20px', // ensures space on very small screens
}
const router = useRouter()
const $q = useQuasar()
const auth = useAuth()
const { t: $t } = useI18n()
const email = ref('')
const password = ref('')
const hover = ref(false)

async function login() {
  try {
    await auth.login(email.value, password.value)

    $q.notify({
      type: 'positive',
      message: $t('loginSuccess'), // <-- i18n key
      position: 'top-right',
    })

    router.push('/main')
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || $t('loginFailed'), // <-- i18n key fallback
      position: 'top-right',
    })
  }
}
</script>

<style scoped>
/* Optional: subtle hover effect for card */
.hovered {
  transform: translateY(-2px);
  transition: all 0.2s ease-in-out;
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
</style>
