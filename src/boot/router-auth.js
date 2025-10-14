// src/boot/auth.js
import { useAuth } from 'stores/auth'

export default async ({ router }) => {
  const auth = useAuth()

  // Try to restore auth state from localStorage
  auth.loadFromLocalStorage()

  // Fetch the Supabase session (if any)
  await auth.fetchUser()

  // If user is not logged in and tries to access a protected page,
  // redirect them to login immediately
  router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !auth.user) {
      next('/login')
    } else {
      next()
    }
  })
}
