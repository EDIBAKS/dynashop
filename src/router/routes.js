const routes = [
  // Auth layout: used when user is NOT logged in
  {
    path: '/',
    component: () => import('layouts/AuthLayout.vue'),
    children: [{ path: '', name: 'Login', component: () => import('pages/signInPage.vue') }],
    meta: { requiresGuest: true },
  },

  // Main layout: used after login
  {
    path: '/main',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'Home', component: () => import('pages/SalesPage.vue') },
      {
        path: '/manage-profile',
        name: 'Profile',
        component: () => import('pages/ManageProfile.vue'),
      },
      {
        path: '/usermanager',
        name: 'users',
        component: () => import('pages/UserManager.vue'),
      },
      {
        path: '/reportspage',
        name: 'reports',
        component: () => import('pages/ReportsPage.vue'),
      },
      {
        path: '/stockpage',
        name: 'stock',
        component: () => import('pages/StockPage.vue'),
      },
      {
        path: '/edit-sale/:receiptno',
        name: 'EditSale',
        component: () => import('pages/EditSalePage.vue'),
        meta: { requiresAuth: true },
      },

      //{
      //path: '/sales',
      // name: 'Sales',
      // component: () => import('pages/Salespage.vue'),
      // },
      // Add more protected pages here
    ],
    meta: { requiresAuth: true },
  },

  // Catch-all route (404)
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
