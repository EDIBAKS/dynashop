import { route } from 'quasar/wrappers'
import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { useAuth } from 'stores/auth'

// Create router instance outside default export
const Router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
Router.beforeEach(async (to, from, next) => {
  const auth = useAuth()
  if (!auth.user) {
    await auth.fetchUser()
  }

  if (to.meta.requiresAuth && !auth.user) {
    next({ path: '/' }) // Redirect to login
  } else if (to.meta.requiresGuest && auth.user) {
    next({ path: '/main' }) // Redirect to home
  } else {
    next()
  }
})

// ✅ Export Router for stores and utilities
export { Router as router }

// ✅ Default export for Quasar boot wrapper
export default route(function () {
  return Router
})
