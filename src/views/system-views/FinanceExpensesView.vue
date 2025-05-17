<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExpensesStore } from '@/stores/expenses'
import { useCatalogStore } from '@/stores/catalog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { IExpense } from '@/utils/interfaces'
import { debounce } from 'lodash-es'

const expensesStore = useExpensesStore()
const catalogStore = useCatalogStore()
const toast = useToast()
const confirm = useConfirm()

// Реактивные данные формы
const amount = ref<number>(0)
const category = ref<string>('')
const description = ref<string>('')
const productId = ref<string>('')
const visible = ref<boolean>(false)
const isEditing = ref<boolean>(false)
const editingExpenseId = ref<string>('')
const searchQuery = ref<string>('')

// Флаги touched для валидации
const amountTouched = ref<boolean>(false)
const categoryTouched = ref<boolean>(false)
const descriptionTouched = ref<boolean>(false)

const validateAmount = (value: number): string | true => {
  if (!value || value <= 0) return 'Сумма должна быть больше 0'
  return true
}

const validateCategory = (value: string): string | true => {
  if (!value) return 'Выберите категорию'
  return true
}

const validateDescription = (value: string): string | true => {
  if (!value) return 'Введите описание'
  if (value.length > 200) return 'Не более 200 символов'
  return true
}

const amountError = computed(() => {
  if (!amountTouched.value) return null
  return validateAmount(amount.value) === true ? null : validateAmount(amount.value)
})

const categoryError = computed(() => {
  if (!categoryTouched.value) return null
  return validateCategory(category.value) === true ? null : validateCategory(category.value)
})

const descriptionError = computed(() => {
  if (!descriptionTouched.value) return null
  return validateDescription(description.value) === true ? null : validateDescription(description.value)
})

const isFormValid = computed(() => {
  return (
    validateAmount(amount.value) === true &&
    validateCategory(category.value) === true &&
    validateDescription(description.value) === true
  )
})

const onDialogHide = () => {
  resetForm()
}

const resetForm = () => {
  amount.value = 0
  category.value = ''
  description.value = ''
  isEditing.value = false
  editingExpenseId.value = ''

  // Сбрасываем флаги touched
  amountTouched.value = false
  categoryTouched.value = false
  descriptionTouched.value = false
}

const openEditDialog = (expense: IExpense) => {
  isEditing.value = true;
  editingExpenseId.value = expense.id;
  amount.value = expense.amount;
  category.value = expense.type;
  description.value = expense.description;
  productId.value = expense.productId || '';

  visible.value = true;
};

const debouncedSearch = debounce((value: string) => {
  searchQuery.value = value
}, 300)

// Фильтрация расходов
const filteredExpenses = computed(() => {
  if (!searchQuery.value) return expensesStore.expenses

  const query = searchQuery.value.toLowerCase()
  return expensesStore.expenses.filter((expense: IExpense) => {
    return (
      (expense.description?.toLowerCase().includes(query)) ||
      (expense.type?.toLowerCase().includes(query)) ||
      (expense.amount?.toString().includes(query)) ||
      (expensesStore.categories.find(c => c.value === expense.type)?.label.toLowerCase().includes(query))
    )
  })
})

const expenseLastEditedInfo = computed(() => {
  if (!isEditing.value || !editingExpenseId.value) return '';

  const expense = expensesStore.expenses.find(e => e.id === editingExpenseId.value);
  if (!expense || !expense.lastEditedDate) return '';

  const date = expense.lastEditedDate instanceof Date
    ? expense.lastEditedDate
    : expense.lastEditedDate.toDate();

  return `${expense.lastEditedByName || 'Неизвестный'}, ${date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
});

const saveExpense = async () => {
  amountTouched.value = true;
  categoryTouched.value = true;
  descriptionTouched.value = true;

  if (!isFormValid.value) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка валидации',
      detail: 'Пожалуйста, заполните все обязательные поля',
      life: 2000
    });
    return;
  }

  try {
    const expenseType = category.value as 'product' | 'marketing' | 'salary' | 'other';

    const expenseData = {
      amount: amount.value,
      type: expenseType,
      description: description.value,
      productId: expenseType === 'product' ? productId.value : null
    };

    if (isEditing.value && editingExpenseId.value) {
      await expensesStore.updateExpense(editingExpenseId.value, expenseData);
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Расход обновлен',
        life: 2000
      });
    } else {
      await expensesStore.addExpense(expenseData);
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Расход добавлен',
        life: 2000
      });
    }

    visible.value = false;
    resetForm();
    await expensesStore.fetchAllExpenses();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ошибка операции';
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      life: 2000
    });
    console.error('Ошибка:', error);
  }
};

const confirmRemoveExpense = async (id: string) => {
  confirm.require({
    message: 'Вы точно хотите удалить этот расход?',
    header: 'Удаление расхода',
    icon: 'pi pi-info-circle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await expensesStore.deleteExpense(id)
        await expensesStore.fetchAllExpenses();
        toast.add({
          severity: 'success',
          summary: 'Успешно',
          detail: 'Расход удален',
          life: 2000
        })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить расход',
          life: 2000
        })
        console.error('Ошибка удаления:', error)
      }
    }
  })
}

onMounted(async () => {
  await Promise.all([
    expensesStore.fetchAllExpenses(),
    catalogStore.fetchProducts()
  ])
})
</script>

<template>
  <div class="content p-4">
    <app-confirmdialog />
    <div class="card">
      <div class="flex justify-between items-center mb-6">
        <app-button @click="visible = true" class="px-4 py-2 text-white rounded-lg transition-colors">
          <i class="pi pi-plus mr-2" />
          <span class="hidden md:inline">Добавить</span>
        </app-button>

        <div class="w-64">
          <app-inputtext @input="debouncedSearch($event.target.value)" placeholder="Поиск расходов..."
            class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      <!-- Диалоговое окно добавления/редактирования -->
      <app-dialog v-model:visible="visible" modal :header="isEditing ? 'Редактирование расхода' : 'Новый расход'"
        class="w-full md:w-1/3" @hide="onDialogHide" :pt="{
          root: { class: 'rounded-lg shadow-xl' },
          header: { class: 'border-b border-gray-200 px-6 py-4 bg-white rounded-t-lg' },
          content: { class: 'px-6 py-4 bg-white' },
          footer: { class: 'border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-2' }
        }">
        <div class="flex flex-col gap-4">
          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
            <app-select v-model="category" :options="expensesStore.categories" optionLabel="label" optionValue="value"
              placeholder="Выберите категорию" :class="{ 'p-invalid': categoryError }" @blur="categoryTouched = true"
              class="w-full" />
            <small v-if="categoryError" class="text-red-500 text-sm mt-1 block">{{ categoryError }}</small>
          </div>

          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Сумма *</label>
            <app-inputnumber v-model="amount" mode="currency" currency="RUB" locale="ru-RU"
              :class="{ 'p-invalid': amountError }" @blur="amountTouched = true" class="w-full" />
            <small v-if="amountError" class="text-red-500 text-sm mt-1 block">{{ amountError }}</small>
          </div>

          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-1">Описание *</label>
            <app-inputtext v-model="description" :class="{ 'p-invalid': descriptionError }"
              @blur="descriptionTouched = true" class="w-full" />
            <small v-if="descriptionError" class="text-red-500 text-sm mt-1 block">{{ descriptionError }}</small>
          </div>
        </div>

        <template #footer>
          <div class="flex flex-col w-full">
            <div v-if="isEditing" class="text-sm text-gray-500 mb-2">
              <div>Последнее изменение:</div>
              <div>{{ expenseLastEditedInfo }}</div>
            </div>
            <div class="flex justify-end gap-2">
              <app-button label="Отмена" severity="secondary" @click="visible = false" />
              <app-button :label="isEditing ? 'Сохранить' : 'Добавить'" @click="saveExpense" :disabled="!isFormValid" />
            </div>
          </div>
        </template>
      </app-dialog>

      <!-- Таблица расходов -->
      <div v-if="expensesStore.loading">
        <div class="flex justify-center items-center py-8">
          <i class="pi pi-spinner pi-spin text-2xl text-blue-500"></i>
        </div>
      </div>

      <div v-else-if="!expensesStore.expenses.length" class="p-8 text-center text-gray-500">
        <i class="pi pi-inbox text-4xl mb-2 text-gray-300"></i>
        <p>Список расходов пуст</p>
      </div>

      <app-datatable v-else :value="filteredExpenses" paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
        class="mt-4">
        <app-column field="category" header="Категория" class="p-3">
          <template #body="{ data }">
            <span class="font-medium">
              {{expensesStore.categories.find(c => c.value === data.type)?.label || data.type}}
            </span>
          </template>
        </app-column>
        <app-column field="description" header="Описание" class="p-3"></app-column>
        <app-column field="amount" header="Сумма" class="p-3">
          <template #body="{ data }">
            <span class="font-semibold">
              {{ data.amount.toLocaleString('ru-RU') }} ₽
            </span>
          </template>
        </app-column>
        <app-column field="createdByName" header="Сотрудник" class="p-3">
          <template #body="{ data }">
            <span class="font-medium">
              {{ data.createdByName }}
            </span>
          </template>
        </app-column>
        <app-column field="date" header="Дата" sortable class="p-3">
          <template #body="{ data }">
            {{ new Date(data.date).toLocaleDateString('ru-RU') }}
          </template>
        </app-column>
        <app-column header="Действия" class="p-3">
          <template #body="{ data }">
            <div class="flex gap-2">
              <app-button icon="pi pi-pencil" severity="info" @click="() => openEditDialog(data)" class="p-2 "
                v-tooltip.top="'Редактировать'" />
              <app-button icon="pi pi-trash" severity="danger" @click="() => confirmRemoveExpense(data.id)" class="p-2"
                v-tooltip.top="'Удалить'" />
            </div>
          </template>
        </app-column>
      </app-datatable>
    </div>
  </div>
</template>

<style scoped></style>