<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import router from '../router'
import { useRoute } from 'vue-router'
import { getAuth, signOut } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'

interface IMenuItem {
  label: string,
  icon: string,
  path?: string,
  show: ComputedRef<boolean>,
  items?: IMenuItem[],
}
const authStore = useAuthStore()
const route = useRoute()
const token = computed(() => authStore.userInfo.token)

const items = ref<IMenuItem[]>([
  {
    label: 'Авторизация',
    icon: 'pi pi-sign-in',
    path: '/login',
    show: computed((): boolean => !token.value),
  },
  {
    label: 'Регистрация',
    icon: 'pi pi-user-plus',
    path: '/register',
    show: computed((): boolean => !token.value),
  },
  {
    label: 'Профиль',
    icon: 'pi pi-user',
    path: '/profile',
    show: computed((): boolean => !!token.value),
  },
  {
    label: 'Статистика',
    icon: 'pi pi-chart-bar',
    path: '/statistics',
    show: computed((): boolean => !!token.value),
  },
  {
    label: 'Финансы',
    icon: 'pi pi-wallet',
    show: computed((): boolean => !!token.value),
    items: [
      {
        label: 'Доходы',
        icon: 'pi pi-arrow-down-right',
        path: '/finance/incomes',
        show: computed((): boolean => !!token.value),
      },
      {
        label: 'Расходы',
        icon: 'pi pi-arrow-up-right',
        path: '/finance/expenses',
        show: computed((): boolean => !!token.value),
      }
    ]
  },
  {
    label: 'Каталог',
    icon: 'pi pi-book',
    path: '/catalog',
    show: computed((): boolean => !!token.value),
  },
])

const checkUser = () => {
    const userToken = localStorage.getItem('userToken');
    const tokens = userToken ? JSON.parse(userToken) : null;
    if (tokens) {
        authStore.userInfo.token = tokens.token
        authStore.userInfo.refreshToken = tokens.refreshToken
        authStore.userInfo.expiresIn = tokens.expiresIn
    }
}
const logout = () => {
    authStore.logout()
    localStorage.removeItem('userToken')
    router.push('/login')
}

checkUser()
</script>

<template>
  <div class="bg-indigo-700 shadow-lg sticky top-0 z-50 w-screen">
    <app-menubar :model="items" class="border-none bg-transparent w-full max-w-[100vw]">
      <template #start>
        <router-link to="/" class="flex items-center no-underline ml-4">
          <i class="pi pi-building text-white text-2xl" />
          <span class="ml-2 text-white font-semibold text-xl hidden md:block">CRM System</span>
        </router-link>
      </template>

      <template #item="{ item, props, hasSubmenu }">
        <template v-if="item.show">
          <router-link v-if="item.path" :to="item.path"
            class="flex items-center no-underline px-3 py-2 rounded-lg transition-colors duration-200" :class="{
              'bg-indigo-500 text-white': route.path === item.path,
              'text-indigo-100 hover:bg-indigo-500 hover:text-white': route.path !== item.path
            }" v-bind="props.action">
            <span :class="item.icon" class="mr-2"></span>
            <span class="whitespace-nowrap">{{ item.label }}</span>
          </router-link>

          <a v-else
            class="flex items-center no-underline px-3 py-2 rounded-lg transition-colors duration-200 cursor-pointer"
            :class="{
              'bg-indigo-500 text-white': route.path.startsWith('/finance'),
              'text-indigo-100 hover:bg-indigo-500 hover:text-white': !route.path.startsWith('/finance')
            }" v-bind="props.action">
            <span :class="item.icon" class="mr-2"></span>
            <span class="whitespace-nowrap">{{ item.label }}</span>
            <i v-if="hasSubmenu" class="pi pi-angle-down ml-2"></i>
          </a>
        </template>
      </template>

      <template #end>
        <div v-if="token" class="flex items-center mr-4">
          <app-button @click="logout"
            class="flex items-center no-underline px-3 py-2 rounded-lg transition-colors duration-200 text-indigo-100 hover:bg-indigo-600 hover:text-white whitespace-nowrap">
            <span class="pi pi-sign-out mr-2"></span>
            <span>Выход</span>
          </app-button>
        </div>
      </template>
    </app-menubar>
  </div>
</template>

<style scoped>
:deep(.p-menubar-submenu) {
  background: #4f46e5 !important;
  color: white !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

:deep(.p-menubar-item-active > .p-menubar-item-content) {
  background: #4f46e5 !important;
  color: white !important;
  border-radius: 0 !important;
}

:deep(.p-menubar-submenu-icon) {
  color: white !important;

}

/* Основные стили меню */
:deep(.p-menubar) {
  background: #4f46e5 !important;
  border: none !important;
  padding: 0.5rem 1rem !important;
  border-radius: 0 !important;
}

/* Мобильное меню - кнопка */
:deep(.p-menubar-button) {
  color: white !important;
  background: transparent !important;
  border: none !important;
}

/* Мобильное меню - выпадающий список */
:deep(.p-menubar .p-menubar-root-list),
:deep(.p-menubar-overlay),
:deep(.p-menubar-overlay .p-menuitem),
:deep(.p-menubar-overlay .p-menuitem-content),
:deep(.p-menubar-overlay .p-menuitem-link),
:deep(.p-menubar-overlay .p-submenu-list),
:deep(.p-menubar-overlay .p-submenu-list .p-menuitem),
:deep(.p-menubar-overlay .p-submenu-list .p-menuitem-content),
:deep(.p-menubar-overlay .p-submenu-list .p-menuitem-link) {
  background: #4f46e5 !important;
  color: white !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}
</style>