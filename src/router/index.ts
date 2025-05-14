import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getAuth, getRedirectResult, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'

const checkUserProfile = async (to: RouteLocationNormalized) => {
  const authStore = useAuthStore();
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) return '/login';
  
  const uid = to.params.uid as string | undefined;
  
  if (!uid) return `/profile/${user.uid}`;
  
  await authStore.loadUserProfile();
  
  if (!authStore.canViewProfile(uid)) {
    return `/profile/${user.uid}`;
  }
  
  return true;
};

const checkAuth = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
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
  next: NavigationGuardNext,
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
    component: () => import('@/views/HomeView.vue'),
    beforeEnter: checkNotAuth,
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth-views/RegistrationView.vue'),
    beforeEnter: checkNotAuth,
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth-views/LoginView.vue'),
    beforeEnter: checkNotAuth,
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/system-views/StatisticsView.vue'),
    beforeEnter: checkAuth,
  },
  {
  path: '/profile/:uid?',
  name: 'Profile',
  component: () => import('@/views/system-views/ProfileView.vue'),
  beforeEnter: checkUserProfile,
},
  {
    path: '/finance',
    name: 'Finance',
    redirect: '/finance/incomes',
    beforeEnter: checkAuth,
  },
  {
    path: '/finance/incomes',
    name: 'Incomes',
    component: () => import('@/views/system-views/FinanceIncomeView.vue'),
    beforeEnter: checkAuth,
  },
  {
    path: '/finance/expenses',
    name: 'Expenses',
    component: () => import('@/views/system-views/FinanceExpensesView.vue'),
    beforeEnter: checkAuth,
  },
  {
    path: '/catalog',
    name: 'Catalog',
    component: () => import('@/views/system-views/CatalogView.vue'),
    beforeEnter: checkAuth,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

router.afterEach(() => {
  const authStore = useAuthStore()
  authStore.error = ''
})

export default router
