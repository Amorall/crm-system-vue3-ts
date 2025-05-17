<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import router from '../router'
import { useRoute } from 'vue-router'
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

const items = ref<IMenuItem[]>([
  {
    label: 'Авторизация',
    icon: 'pi pi-sign-in',
    path: '/login',
    show: computed((): boolean => !authStore.userInfo.userId),
  },
  {
    label: 'Регистрация',
    icon: 'pi pi-user-plus',
    path: '/register',
    show: computed((): boolean => !authStore.userInfo.userId),
  },
  {
    label: 'Профиль',
    icon: 'pi pi-user',
    path: '/profile',
    show: computed((): boolean => !!authStore.userInfo.userId),
  },
  {
    label: 'Статистика',
    icon: 'pi pi-chart-bar',
    path: '/statistics',
    show: computed((): boolean => !!authStore.userInfo.userId),
  },
  {
    label: 'Финансы',
    icon: 'pi pi-wallet',
    show: computed((): boolean => !!authStore.userInfo.userId),
    items: [
      {
        label: 'Доходы',
        icon: 'pi pi-arrow-down-right',
        path: '/finance/incomes',
        show: computed((): boolean => !!authStore.userInfo.userId),
      },
      {
        label: 'Расходы',
        icon: 'pi pi-arrow-up-right',
        path: '/finance/expenses',
        show: computed((): boolean => !!authStore.userInfo.userId),
      }
    ]
  },
  {
    label: 'Каталог',
    icon: 'pi pi-book',
    path: '/catalog',
    show: computed((): boolean => !!authStore.userInfo.userId),
  },
])

const isActiveRoute = (itemPath: string | undefined) => {
  if (!itemPath) return false;
  if (itemPath === '/profile') return route.path.startsWith('/profile');
  return route.path === itemPath;
}

const logout = () => {
    authStore.logout()
    router.push('/login')
}
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
              'bg-indigo-500 text-white': isActiveRoute(item.path),
              'text-indigo-100 hover:bg-indigo-500 hover:text-white': !isActiveRoute(item.path)
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
        <div v-if="authStore.userInfo.userId" class="flex items-center mr-4">
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