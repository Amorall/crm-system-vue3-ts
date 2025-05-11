import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'

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

const checkProfileAccess = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const auth = getAuth()

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    unsubscribe() // Отписываемся после первого вызова

    if (!user) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }

    try {
      const db = getFirestore()
      const [currentUserDoc, targetUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        to.params.uid ? getDoc(doc(db, 'users', to.params.uid as string)) : null,
      ])

      // Проверяем существование текущего пользователя
      if (!currentUserDoc.exists()) {
        next('/error?message=current_user_not_found')
        return
      }

      const currentUserData = currentUserDoc.data()
      const targetUid = to.params.uid || user.uid

      // Проверяем существование целевого пользователя (если запрашивается чужой профиль)
      if (targetUid !== user.uid && !targetUserDoc?.exists()) {
        next('/error?message=profile_not_found')
        return
      }

      // Проверяем права доступа
      if (currentUserData.permission === 3 || user.uid === targetUid) {
        next()
      } else {
        next(`/profile/${user.uid}`) // Перенаправляем на свой профиль
      }
    } catch (error) {
      console.error('Ошибка проверки доступа:', error)
      next('/error?message=access_check_error')
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
    beforeEnter: checkAuth,
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
