<template>
  <q-page class="q-pa-md">
    <!-- Back Button -->
    <q-btn flat icon="arrow_back" label="Back" color="primary" class="q-mb-md" @click="goBack" />

    <q-card flat bordered class="q-pa-md">
      <!-- Tabs -->
      <q-tabs v-model="tab" class="text-primary" active-color="primary">
        <q-tab name="create" label="Create User" />
        <q-tab name="edit" label="Edit Profile" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- Create User Panel -->
        <q-tab-panel name="create">
          <div v-if="!isSuperAdmin">
            <q-banner class="bg-grey-2 text-black q-mb-md" dense rounded>
              Only SuperAdmins can create new users.
            </q-banner>
          </div>
          <q-form @submit.prevent="createUser">
            <q-input
              v-model="createForm.names"
              label="Full Name"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.username"
              label="Username"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.email"
              label="Email"
              type="email"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.telephone"
              label="Telephone"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.department"
              label="Department"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.role"
              label="Role"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />
            <q-input
              v-model="createForm.password"
              label="Password"
              type="password"
              :disable="!isSuperAdmin"
              class="q-mb-sm"
            />

            <q-btn
              label="Create User"
              type="submit"
              color="primary"
              :disable="!isSuperAdmin"
              class="q-mt-md"
            />
          </q-form>
        </q-tab-panel>

        <!-- Edit Profile Panel -->
        <q-tab-panel name="edit">
          <q-form @submit.prevent="updateProfile">
            <q-input v-model="editForm.names" label="Full Name" class="q-mb-sm" />
            <q-input v-model="editForm.username" label="Username" class="q-mb-sm" />
            <q-input v-model="editForm.telephone" label="Telephone" class="q-mb-sm" />
            <q-input v-model="editForm.department" label="Department" class="q-mb-sm" />

            <q-separator class="q-my-md" />

            <q-input
              v-model="editForm.newPassword"
              label="New Password"
              type="password"
              class="q-mb-sm"
            />
            <q-input
              v-model="editForm.confirmPassword"
              label="Confirm Password"
              type="password"
              class="q-mb-sm"
            />

            <q-btn label="Update Profile" type="submit" color="primary" class="q-mt-md" />
          </q-form>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuth } from 'stores/auth'
import { supabase } from 'boot/supabase'

const $q = useQuasar()
const router = useRouter()
const auth = useAuth()

const tab = ref('create')

const createForm = ref({
  names: '',
  username: '',
  email: '',
  telephone: '',
  role: '',
  department: '',
  password: '',
})

const editForm = ref({
  names: '',
  username: '',
  telephone: '',
  department: '',
  newPassword: '',
  confirmPassword: '',
})

// On mount, populate editForm from userDetails
onMounted(() => {
  if (auth.userDetails) {
    editForm.value = {
      names: auth.userDetails.names,
      username: auth.userDetails.username,
      telephone: auth.userDetails.telephone,
      department: auth.userDetails.department,
      newPassword: '',
      confirmPassword: '',
    }
  }
})

// Computed role check
const isSuperAdmin = computed(() => auth.userDetails?.role === 'SuperAdmin')

// Navigation
const goBack = () => router.push('/')

// Create user logic
const createUser = async () => {
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: createForm.value.email,
      password: createForm.value.password,
    })

    if (signUpError) throw signUpError
    const newUserId = signUpData.user.id

    const { error: insertError } = await supabase.from('users').insert({
      id: newUserId,
      names: createForm.value.names,
      username: createForm.value.username,
      telephone: createForm.value.telephone,
      role: createForm.value.role,
      department: createForm.value.department,
      email: createForm.value.email,
    })

    if (insertError) throw insertError

    $q.notify({ type: 'positive', message: 'User created successfully' })
    router.push('/')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}

// Update current profile

const updateProfile = async () => {
  try {
    // Step 1: Update user details in `users` table
    await auth.updateProfile({
      names: editForm.value.names,
      username: editForm.value.username,
      telephone: editForm.value.telephone,
      department: editForm.value.department,
    })

    // Step 2: If password is being changed
    if (editForm.value.newPassword) {
      if (editForm.value.newPassword !== editForm.value.confirmPassword) {
        $q.notify({ type: 'negative', message: 'Passwords do not match' })
        return
      }

      // Update password in Supabase Auth
      await auth.updatePassword(editForm.value.newPassword)

      $q.notify({
        type: 'positive',
        message: 'Password changed successfully. Please log in again.',
      })

      // Log out and redirect to login page
      await auth.logout()
      router.push('/')
      return
    }

    // If only profile is updated
    $q.notify({ type: 'positive', message: 'Profile updated successfully' })
    router.push('/')
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}
</script>

<style scoped>
.q-page {
  max-width: 600px;
  margin: 0 auto;
}
</style>
