<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useSalesStore } from '@/stores/sales'
import { useExpensesStore } from '@/stores/expenses'
import { useCatalogStore } from '@/stores/catalog'
import { throttle } from 'lodash-es'

import Skeleton from 'primevue/skeleton'
import Chart from 'primevue/chart'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import StatCard from '@/components/StatCard.vue'


const salesStore = useSalesStore()
const expensesStore = useExpensesStore()
const catalogStore = useCatalogStore()

const isLoading = ref(true)
// Инициализация ссылок на графики
const salesChart = ref<InstanceType<typeof Chart> | null>(null)
const expensesChart = ref<InstanceType<typeof Chart> | null>(null)
const stockChart = ref<InstanceType<typeof Chart> | null>(null)

// Загрузка данных
onMounted(async () => {
  try {
    await Promise.all([
      salesStore.fetchAllSales(),
      expensesStore.fetchAllExpenses(),
      catalogStore.fetchProducts()
    ])
  } catch (error) {
    console.error('Ошибка загрузки данных:', error)
  } finally {
    isLoading.value = false // Загрузка завершена
  }
})

// Троттлинг обновлений
const updateCharts = throttle(() => {
  salesChart.value?.refresh()
  expensesChart.value?.refresh()
  stockChart.value?.refresh()
}, 1000)

watch([salesStore.sales, expensesStore.expenses], updateCharts, { deep: true })

// Общая статистика
const totalSales = computed(() => {
  return salesStore.sales
    .filter(sale => sale.status === 'closed')
    .reduce((sum, sale) => {
      return sum + sale.products.reduce((productSum, product) => {
        return productSum + (product.price * product.quantity)
      }, 0)
    }, 0)
})

const totalExpenses = computed(() => {
  return expensesStore.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
})

const productsCount = computed(() => catalogStore.products.length)

const profitability = computed(() => {
  if (totalSales.value === 0) return 0
  return ((totalSales.value - totalExpenses.value) / totalSales.value * 100).toFixed(1)
})

// Топ товаров по остаткам
const topProducts = computed(() => {
  return [...catalogStore.products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
})

const getStockSeverity = (stock: number) => {
  if (stock > 10) return 'success'
  if (stock > 0) return 'warning'
  return 'danger'
}

// График продаж и расходов по месяцам
const salesExpensesChartData = computed(() => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const currentYear = new Date().getFullYear()

  // Группировка по месяцам
  const salesByMonth = Array(12).fill(0)
  const expensesByMonth = Array(12).fill(0)

salesStore.sales.forEach(sale => {
  let saleDate: Date;
  if (sale.createdDate instanceof Date) {
    saleDate = sale.createdDate;
  } else if (sale.createdDate && typeof sale.createdDate.toDate === 'function') {
    saleDate = sale.createdDate.toDate();
  } else {
    return;
  }
  if (saleDate.getFullYear() === currentYear && sale.status === 'closed') {
    const saleTotal = sale.products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);
    salesByMonth[saleDate.getMonth()] += saleTotal;
  }
});

  expensesStore.expenses.forEach(expense => {
  let expenseDate: Date;
  if (expense.date instanceof Date) {
    expenseDate = expense.date;
  } else if (expense.date && typeof expense.date.toDate === 'function') {
    expenseDate = expense.date.toDate();
  } else {
    return;
  }
  if (expenseDate.getFullYear() === currentYear) {
    expensesByMonth[expenseDate.getMonth()] += expense.amount || 0;
  }
});

  return {
    labels: months,
    datasets: [
      {
        label: 'Продажи',
        backgroundColor: '#42A5F5',
        data: salesByMonth
      },
      {
        label: 'Расходы',
        backgroundColor: '#FF6384',
        data: expensesByMonth
      }
    ]
  }
})

// График распределения расходов по категориям
const expensesByCategoryData = computed(() => {
  const categories = expensesStore.categories
  const data = Array(categories.length).fill(0)

  expensesStore.expenses.forEach(expense => {
    const index = categories.findIndex(c => c.value === expense.type)
    if (index !== -1) {
      data[index] += expense.amount || 0
    }
  })

  return {
    labels: categories.map(c => c.label),
    datasets: [
      {
        data: data,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC249', '#EA5F89', '#00D8FF', '#E7E9ED'
        ]
      }
    ]
  }
})

// График остатков товаров
const productsStockData = computed(() => {
  const categories = [...new Set(catalogStore.products.map(p => p.category))]
  const data = Array(categories.length).fill(0)

  catalogStore.products.forEach(product => {
    const index = categories.indexOf(product.category)
    if (index !== -1) {
      data[index] += product.stock || 0
    }
  })

  return {
    labels: categories,
    datasets: [
      {
        data: data,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC249', '#EA5F89', '#00D8FF', '#E7E9ED'
        ]
      }
    ]
  }
})

// Опции графиков
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0 // Отключаем анимацию
  },
  hover: {
    animationDuration: 0 // Отключаем анимацию при наведении
  },
  responsiveAnimationDuration: 0, // Отключаем анимацию при изменении размера
  scales: {
    y: {
      beginAtZero: true
    }
  }
})

const pieChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  plugins: {
    legend: {
      position: 'right'
    }
  }
})

const doughnutChartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  plugins: {
    legend: {
      position: 'right'
    }
  },
  cutout: '70%'
})
</script>

<template>
  <div class="content p-4">
    <h1 class="text-2xl font-bold mb-6">Аналитика и статистика</h1>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Левая панель - статистика -->
      <div class="w-full lg:w-1/4 flex flex-col gap-4">
        <div class="card p-4 bg-white rounded-lg shadow">
          <h3 class="font-semibold mb-2">Общая статистика</h3>
          <div class="grid grid-cols-2 gap-4">
            <StatCard title="Общие продажи" :value="totalSales" icon="pi pi-chart-line"
              color="bg-blue-100 text-blue-600" />
            <StatCard title="Общие расходы" :value="totalExpenses" icon="pi pi-money-bill"
              color="bg-red-100 text-red-600" />
            <StatCard title="Товаров в каталоге" :value="productsCount" icon="pi pi-box"
              color="bg-green-100 text-green-600" is-units />
            <StatCard title="Доходность" :value="profitability" icon="pi pi-percentage"
              color="bg-purple-100 text-purple-600" is-percentage />
          </div>
        </div>

        <div class="card p-4 bg-white rounded-lg shadow flex-1">
          <h3 class="font-semibold mb-2">Топ товаров</h3>

          <div v-if="isLoading" class="skeleton-container">
            <Skeleton width="100%" height="2rem" class="mb-2"></Skeleton>
            <Skeleton width="100%" height="2rem" class="mb-2"></Skeleton>
            <Skeleton width="100%" height="2rem" class="mb-2"></Skeleton>
            <Skeleton width="100%" height="2rem" class="mb-2"></Skeleton>
            <Skeleton width="100%" height="2rem"></Skeleton>
          </div>

          <DataTable v-else :value="topProducts" :lazy="true" :rows="5" class="p-datatable-sm">
            <Column field="name" header="Товар"></Column>
            <Column field="stock" header="Остаток">
              <template #body="{ data }">
                <Tag :value="data.stock" :severity="getStockSeverity(data.stock)" />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>

      <div class="w-full lg:w-3/4 flex flex-col gap-6">
        <!-- Верхний график -->
        <div class="card p-4 bg-white rounded-lg shadow h-96">
          <h3 class="font-semibold mb-2">Продажи и расходы по месяцам</h3>
          <Skeleton v-if="isLoading" width="100%" height="100%"></Skeleton>
          <Chart v-else ref="salesChart" type="bar" :data="salesExpensesChartData" :options="chartOptions"
            class="h-full" />
        </div>

        <!-- Нижние графики -->
        <div class="flex flex-col md:flex-row gap-6">
          <div class="w-full md:w-1/2 card p-4 bg-white rounded-lg shadow h-96">
            <h3 class="font-semibold mb-2">Распределение расходов</h3>
            <Skeleton v-if="isLoading" width="100%" height="100%"></Skeleton>
            <Chart v-else ref="expensesChart" type="pie" :data="expensesByCategoryData" :options="pieChartOptions"
              class="h-full" />
          </div>

          <div class="w-full md:w-1/2 card p-4 bg-white rounded-lg shadow h-96">
            <h3 class="font-semibold mb-2">Остатки товаров</h3>
            <Skeleton v-if="isLoading" width="100%" height="100%"></Skeleton>
            <Chart v-else ref="stockChart" type="doughnut" :data="productsStockData" :options="doughnutChartOptions"
              class="h-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-chart) {
  width: 100% !important;
  height: calc(100% - 2rem) !important;
  /* Учитываем заголовок */
  margin-top: 1rem;
}

.card {
  position: relative;
  overflow: hidden;
}

/* Дополнительные стили для круговых диаграмм */
:deep(.p-chart.p-chart-doughnut),
:deep(.p-chart.p-chart-pie) {
  padding: 1rem;
  box-sizing: border-box;
}

:deep(.p-skeleton) {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.6;
  }
}
</style>