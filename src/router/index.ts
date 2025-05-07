import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HomeView from '../views/HomeView.vue'
import RegistrationView from '../views/auth-views/RegistrationView.vue'
import LoginView from '@/views/auth-views/LoginView.vue'
import StatisticsView from '@/views/system-views/StatisticsView.vue'
import ProfileView from '@/views/system-views/ProfileView.vue'
import FinanceIncomesView from '@/views/system-views/FinanceIncomeView.vue'
import FinanceExpensesView from '@/views/system-views/FinanceExpensesView.vue'
import CatalogView from '@/views/system-views/CatalogView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        auth: false,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: RegistrationView,
      meta: {
        auth: false,
      },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        auth: false,
      },
    },
    {
      path: '/statistics',
      name: 'statistics',
      component: StatisticsView,
      meta: {
        auth: true,
      },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: {
        auth: true,
      },
    },
    {
      path: '/finance',
      name: 'finance',
      redirect: '/finance/incomes',
      meta: {
        auth: true,
      },
    },
    {
      path: '/finance/incomes',
      name: 'incomes',
      component: FinanceIncomesView,
      meta: {
        auth: true,
      },
    },
    {
      path: '/finance/expenses',
      name: 'expenses',
      component: FinanceExpensesView,

      meta: {
        auth: true,
      },
    },
    {
      path: '/catalog',
      name: 'catalog',
      component: CatalogView,
      meta: {
        auth: true,
      },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.auth && !authStore.userInfo.token) {
    next('/login')
  } else if (!to.meta.auth && authStore.userInfo.token && (to.path === '/login' || to.path === '/register')) {
    next('/statistics')
  } else {
    next()
  }
})

router.afterEach(() => {
  const authStore = useAuthStore()
  authStore.error = ''
})

export default router
