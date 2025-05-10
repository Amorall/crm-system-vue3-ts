import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'

import HomeView from '../views/HomeView.vue'
import RegistrationView from '../views/auth-views/RegistrationView.vue'
import LoginView from '@/views/auth-views/LoginView.vue'
import StatisticsView from '@/views/system-views/StatisticsView.vue'
import ProfileView from '@/views/system-views/ProfileView.vue'
import FinanceIncomesView from '@/views/system-views/FinanceIncomeView.vue'
import FinanceExpensesView from '@/views/system-views/FinanceExpensesView.vue'
import CatalogView from '@/views/system-views/CatalogView.vue'

const checkAuth = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  let isAuth = false

  onAuthStateChanged(getAuth(), (user) => {
    if (user && !isAuth) {
      isAuth = true
      next()
    } else if (!user && !isAuth) {
      isAuth = true
      next('/login')
    }
  })
}

const checkNotAuth = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  let isAuth = false

  onAuthStateChanged(getAuth(), (user) => {
    if (user && !isAuth) {
      isAuth = true
      next('/statistics')
    } else if (!user && !isAuth) {
      isAuth = true
      next()
    }
  })
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    beforeEnter: checkNotAuth
  },
  {
    path: '/register',
    name: 'Register',
    component: RegistrationView,
    beforeEnter: checkNotAuth 
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    beforeEnter: checkNotAuth 
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: StatisticsView,
    beforeEnter: checkAuth
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    beforeEnter: checkAuth
  },
  {
    path: '/finance',
    name: 'Finance',
    redirect: '/finance/incomes',
    beforeEnter: checkAuth
  },
  {
    path: '/finance/incomes',
    name: 'Incomes',
    component: FinanceIncomesView,
    beforeEnter: checkAuth
  },
  {
    path: '/finance/expenses',
    name: 'Expenses',
    component: FinanceExpensesView,
    beforeEnter: checkAuth
  },
  {
    path: '/catalog',
    name: 'Catalog',
    component: CatalogView,
    beforeEnter: checkAuth
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes
})

router.afterEach(() => {
  const authStore = useAuthStore()
  authStore.error = ''
})

export default router