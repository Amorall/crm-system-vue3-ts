<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore } from '@/stores/sales'
import { Timestamp } from 'firebase/firestore';
import type { IIncome } from '@/utils/interfaces';
import { useRoute, useRouter } from 'vue-router';
import { useEmployeesStore } from '@/stores/employees';

import Loader from '../../components/loader.vue'


interface IMonthlySales {
  [key: string]: {
    open: number;
    closed: number;
    canceled: number; 
  };
}
const router = useRouter();
const route = useRoute()
const authStore = useAuthStore()
const salesStore = useSalesStore()
const employeesStore = useEmployeesStore();

const chartData = ref();
const chartOptions = ref();
const isLoading = ref<boolean>(true)
const viewedUser = ref<any>(null);
const profileUserId = computed(() => route.params.uid || authStore.userInfo.userId)
const isCurrentUserProfile = computed(() => profileUserId.value === authStore.userInfo.userId)
const canEditStatus = computed(() => authStore.canEditStatus(profileUserId.value as string))

const userStats = computed(() => {
  const userSales = salesStore.sales.filter(sale => sale.createdBy === viewedUser.value?.userId);
  return {
    total: userSales.length,
    open: userSales.filter((s: { status: string }) => s.status === 'open').length,
    closed: userSales.filter((s: { status: string }) => s.status === 'closed').length,
    canceled: userSales.filter((s: { status: string }) => s.status === 'canceled').length
  };
});

const statusOptions = [
  { label: 'На работе', value: 'working' },
  { label: 'В отпуске', value: 'vacation' },
  { label: 'На больничном', value: 'sick_leave' }
]

const switchProfile = (userId: string) => {
  router.push(`/profile/${userId}`);
};

const updateStatus = async (newStatus: string) => {
  try {
    isLoading.value = true;
    const updatedUser = await authStore.updateUserStatus(
      newStatus as 'working' | 'vacation' | 'sick_leave',
      profileUserId.value as string
    );
    viewedUser.value = updatedUser;
    prepareMonthlyChartData(); // Обновляем данные графика
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
  } finally {
    isLoading.value = false;
  }
};

const lastLoginFormatted = computed(() => {
  const lastLogin = viewedUser.value?.lastLogin;
  
  if (!lastLogin) return 'Нет данных';
  
  try {
    const date = lastLogin instanceof Date 
      ? lastLogin 
      : 'toDate' in lastLogin 
        ? lastLogin.toDate() 
        : new Date(lastLogin.seconds * 1000);
    
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Ошибка форматирования даты:', e);
    return 'Некорректная дата';
  }
});

const prepareMonthlyChartData = () => {
  const userSales = salesStore.sales.filter((sale: IIncome) => 
    sale.createdBy === viewedUser.value?.userId
  );
  
  if (userSales.length === 0) {
    chartData.value = {
      labels: ['Нет данных'],
      datasets: [
        {
          label: 'Открытые сделки',
          backgroundColor: '#4CAF50',
          data: [0]
        },
        {
          label: 'Закрытые сделки',
          backgroundColor: '#F44336',
          data: [0]
        },
        {
          label: 'Отмененные сделки',
          backgroundColor: '#9E9E9E',
          data: [0]
        }
      ]
    };
    return;
  }
  
  const salesByMonth = userSales.reduce((acc: IMonthlySales, sale: IIncome) => {
    let date: Date;
    
    if (sale.createdDate && typeof sale.createdDate === 'object' && 'toDate' in sale.createdDate) {
      date = (sale.createdDate as unknown as Timestamp).toDate();
    } 
    else if (sale.createdDate && typeof sale.createdDate === 'object' && 'seconds' in sale.createdDate) {
      date = new Date((sale.createdDate as { seconds: number }).seconds * 1000);
    } 
    else {
      date = sale.createdDate instanceof Date 
        ? sale.createdDate 
        : new Date(sale.createdDate as string | number);
    }
    
    const monthYear = `${date.getMonth()+1}/${date.getFullYear()}`;
    
    if (!acc[monthYear]) {
      acc[monthYear] = { open: 0, closed: 0, canceled: 0 };
    }
    
    if (sale.status === 'open') {
      acc[monthYear].open++;
    } else if (sale.status === 'closed') {
      acc[monthYear].closed++;
    } else if (sale.status === 'canceled') {
      acc[monthYear].canceled++;
    }
    
    return acc;
  }, {} as IMonthlySales);

  const months = Object.keys(salesByMonth).sort((a, b) => {
    const [aMonth, aYear] = a.split('/').map(Number);
    const [bMonth, bYear] = b.split('/').map(Number);
    return aYear - bYear || aMonth - bMonth;
  });

  const formattedLabels = months.map(month => {
    const [m, y] = month.split('/');
    return `${m.padStart(2, '0')}.${y}`;
  });
  
  chartData.value = {
    labels: formattedLabels,
    datasets: [
      {
        label: 'Открытые сделки',
        backgroundColor: '#4CAF50',
        data: months.map(m => salesByMonth[m]?.open || 0)
      },
      {
        label: 'Закрытые сделки',
        backgroundColor: '#F44336',
        data: months.map(m => salesByMonth[m]?.closed || 0)
      },
      {
        label: 'Отмененные сделки',
        backgroundColor: '#9E9E9E',
        data: months.map(m => salesByMonth[m]?.canceled || 0)
      }
    ]
  };

  chartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        ticks: {
          precision: 0
        }
      }
    }
  };
};

const employees = computed(() => 
  employeesStore.employees.filter(e => e.id !== authStore.userInfo.userId)
);

watch(() => route.params.uid, async (newUid) => {
  if (!newUid) return;
  
  try {
    isLoading.value = true;
    
    if (!authStore.canViewProfile(newUid as string)) {
      await router.push('/profile');
      return;
    }

    // Загружаем данные нового пользователя
    viewedUser.value = await authStore.loadAnyUserProfile(newUid as string);
    prepareMonthlyChartData();
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  } finally {
    isLoading.value = false;
  }
});

onMounted(async () => {
  try {
    isLoading.value = true;
    
    if (authStore.userInfo.isAdmin) {
      await employeesStore.fetchEmployees();
    }

    await Promise.all([
      salesStore.fetchAllSales(),
      authStore.loadAnyUserProfile(profileUserId.value as string).then(data => {
        viewedUser.value = data;
      })
    ]);
    
    prepareMonthlyChartData();
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="viewedUser" class="content p-4">
    <app-card>
      <template #header v-if="authStore.userInfo.isAdmin">
        <div class="flex items-center gap-2 p-2">
          <span class="font-medium">Переключить профиль:</span>
          <app-select 
            :options="employees"
            optionLabel="name"
            optionValue="id"
            @change="switchProfile($event.value)"
            placeholder="Выберите сотрудника"
          />
        </div>
      </template>
      <template #content>
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Блок с информацией о пользователе -->
          <div class="w-full md:w-1/3">
            <div class="flex flex-col items-center mb-6">
              <div class="w-32 h-32 rounded-full flex items-center justify-center text-6xl" 
                :class="viewedUser?.gender === 'Женский' 
                  ? 'bg-pink-100 text-pink-500' 
                  : 'bg-blue-100 text-blue-500'">
                <i class="pi pi-user text-6xl"></i>
              </div>
              <h2 class="text-xl font-semibold text-center">
                {{ `${viewedUser?.lastName} ${viewedUser?.firstName}` }}
                <span v-if="!isCurrentUserProfile" class="text-sm text-gray-500">(профиль сотрудника)</span>
              </h2>
              <div class="flex items-center gap-2 mt-2">
                <app-tag :value="viewedUser?.jobPosition" severity="info" />
                <app-tag :value="statusOptions.find(s => s.value === viewedUser?.status)?.label || 'Не указан'" 
                         :severity="viewedUser?.status === 'working' ? 'success' : 
                                   viewedUser?.status === 'vacation' ? 'warning' : 'danger'" />
              </div>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="text-gray-500 text-sm">ФИО:</label>
                <p class="font-medium">{{ 
                  `${viewedUser?.lastName || ''} 
                  ${viewedUser?.firstName || ''} 
                  ${viewedUser?.middleName || ''}`.trim() 
                }}</p>
              </div>
              
              <div>
                <label class="text-gray-500 text-sm">Email:</label>
                <p class="font-medium">{{ viewedUser?.email }}</p>
              </div>
              
              <div>
                <label class="text-gray-500 text-sm">Должность:</label>
                <p class="font-medium">{{ viewedUser?.jobPosition }}</p>
              </div>
              
              <div>
                <label class="text-gray-500 text-sm">Пол:</label>
                <p class="font-medium">{{ 
                  viewedUser?.gender === 'Мужской' ? 'Мужской' : 
                  viewedUser?.gender === 'Женский' ? 'Женский' : 'Не указан' 
                }}</p>
              </div>

              <div>
                <label class="text-gray-500 text-sm">Последний вход:</label>
                <p class="font-medium">{{ lastLoginFormatted }}</p>
              </div>
              
              <div>
                <label class="text-gray-500 text-sm">Всего входов:</label>
                <p class="font-medium">{{ viewedUser?.loginCount || 0 }}</p>
              </div>

              <div v-if="authStore.userInfo.isAdmin">
                <label class="text-gray-500 text-sm">Статус:</label>
                <app-select 
                  v-model="viewedUser.status" 
                  :options="statusOptions" 
                  optionLabel="label" 
                  optionValue="value"
                  @change="updateStatus($event.value)"
                  class="w-full"
                  :disabled="!canEditStatus"
                />
              </div>
            </div>
          </div>

          <!-- Блок со статистикой -->
          <div class="w-full md:w-2/3">
            <h2 class="text-xl font-semibold mb-4">Статистика сделок</h2>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <app-card class="bg-blue-50">
                <template #content>
                  <div class="text-center">
                    <div class="text-blue-600 text-2xl font-bold">{{ userStats.total }}</div>
                    <div class="text-gray-600">Всего сделок</div>
                  </div>
                </template>
              </app-card>
              
              <app-card class="bg-green-50">
                <template #content>
                  <div class="text-center">
                    <div class="text-green-600 text-2xl font-bold">{{ userStats.open }}</div>
                    <div class="text-gray-600">Открытые</div>
                  </div>
                </template>
              </app-card>
              
              <app-card class="bg-orange-50">
                <template #content>
                  <div class="text-center">
                    <div class="text-orange-600 text-2xl font-bold">{{ userStats.closed }}</div>
                    <div class="text-gray-600">Закрытые</div>
                  </div>
                </template>
              </app-card>
              
              <app-card class="bg-gray-50">
                <template #content>
                  <div class="text-center">
                    <div class="text-gray-600 text-2xl font-bold">{{ userStats.canceled }}</div>
                    <div class="text-gray-600">Отмененные</div>
                  </div>
                </template>
              </app-card>
            </div>

            <h3 class="text-lg font-semibold mt-6 mb-4">Активность</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-card>
                <template #content>
                  <div class="flex items-center gap-4">
                    <div class="bg-blue-100 p-3 rounded-full">
                      <i class="pi pi-sign-in text-blue-600 text-xl"></i>
                    </div>
                    <div>
                      <div class="text-gray-500">Последний вход</div>
                      <div class="font-medium">{{ lastLoginFormatted }}</div>
                    </div>
                  </div>
                </template>
              </app-card>
              
              <app-card>
                <template #content>
                  <div class="flex items-center gap-4">
                    <div class="bg-green-100 p-3 rounded-full">
                      <i class="pi pi-chart-line text-green-600 text-xl"></i>
                    </div>
                    <div>
                      <div class="text-gray-500">Всего входов</div>
                      <div class="font-medium">{{ viewedUser?.loginCount || 0 }}</div>
                    </div>
                  </div>
                </template>
              </app-card>
            </div>
            
            <div class="mt-6">
              <h3 class="text-lg font-semibold mb-4">Динамика сделок</h3>
              <div class="card">
                <app-chart
                  v-if="chartData"
                  type="bar" 
                  :data="chartData" 
                  :options="chartOptions" 
                  style="height: 300px" 
                />
                <div v-else class="text-center py-8 text-gray-500">
                  Нет данных для отображения графика
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </app-card>
  </div>
  <div v-else class="text-center py-8">
    <Loader />
    <p class="mt-4">Загрузка данных профиля...</p>
  </div>
</template>

<style scoped>
/* Дополнительные стили при необходимости */
</style>