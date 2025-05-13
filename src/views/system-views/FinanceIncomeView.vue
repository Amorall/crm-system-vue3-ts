<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getAuth } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore } from '@/stores/sales'
import { useCatalogStore } from '@/stores/catalog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { debounce } from 'lodash-es'
import Loader from '../../components/loader.vue'

const authStore = useAuthStore()
const salesStore = useSalesStore()
const catalogStore = useCatalogStore()
const toast = useToast()
const confirm = useConfirm()

// Реактивные данные формы
const selectedProducts = ref<Array<{ id: string, name: string, price: number, quantity: number }>>([])
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientEmail = ref<string>('')
const clientWhApp = ref<string>('')
const clientTg = ref<string>('')
const editingSaleId = ref<string>('')
const searchQuery = ref<string>('')
const status = ref<string>('open')
const visible = ref<boolean>(false)
const isEditing = ref<boolean>(false)
const productsDialogVisible = ref<boolean>(false)
const currentProducts = ref<Array<{ id: string, name: string, quantity: number }>>([])
const currentTotalPrice = ref<number>(0)
const statusOptions = [
  { value: 'open', label: 'Открыта', severity: 'success' },
  { value: 'closed', label: 'Закрыта', severity: 'danger' },
  { value: 'canceled', label: 'Отменена', severity: 'secondary' }
]

// Флаги touched для валидации
const clientNameTouched = ref<boolean>(false)
const clientPhoneTouched = ref<boolean>(false)
const clientEmailTouched = ref<boolean>(false)
const clientWhAppTouched = ref<boolean>(false)
const clientTgTouched = ref<boolean>(false)
const productsTouched = ref<boolean>(false)

const validateClientName = (value: string): string | true => {
  if (!value) return 'ФИО клиента обязательно'
  if (value.length > 100) return 'Не более 100 символов'
  return true
}

const validateEmail = (value: string): string | true => {
  if (!value) return ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Некорректный email (пример: example@mail.ru)'
  return true
}

const validateTelegram = (value: string): string | true => {
  if (!value) return ''
  if (value.length > 32) return 'Не более 32 символов'
  return true
}

const validateWhApp = (value: string): string | true => {
  if (!value) return ''
  return true
}

const validatePhone = (value: string): string | true => {
  if (!value) return ''
  return true
}

const validateProducts = (products: Array<any>): string | true => {
  if (products.length === 0) return 'Выберите хотя бы один продукт'
  return true
}

// Вычисляемые свойства для ошибок
const clientNameError = computed(() => {
  if (!clientNameTouched.value) return null
  return validateClientName(clientName.value) === true ? null : validateClientName(clientName.value)
})

const clientEmailError = computed(() => {
  if (!clientEmailTouched.value) return null
  return validateEmail(clientEmail.value) === true ? null : validateEmail(clientEmail.value)
})

const clientTgError = computed(() => {
  if (!clientTgTouched.value) return null
  return validateTelegram(clientTg.value) === true ? null : validateTelegram(clientTg.value)
})

const productsError = computed(() => {
  if (!productsTouched.value) return null
  return validateProducts(selectedProducts.value) === true ? null : validateProducts(selectedProducts.value)
})

const clientWhAppError = computed(() => {
  if (!clientWhAppTouched.value) return null
  return validateWhApp(clientWhApp.value) === true ? null : validateWhApp(clientWhApp.value)
})

const clientPhoneError = computed(() => {
  if (!clientPhoneTouched.value) return null
  return validatePhone(clientPhone.value) === true ? null : validatePhone(clientPhone.value)
})

// Проверка наличия хотя бы одного контакта
const hasAtLeastOneContact = computed(() => {
  return clientPhone.value || clientEmail.value || clientWhApp.value || clientTg.value
})

const contactError = computed(() => {
  const touched = clientPhoneTouched.value || clientEmailTouched.value ||
    clientWhAppTouched.value || clientTgTouched.value
  if (!touched) return null
  return hasAtLeastOneContact.value ? null : 'Укажите хотя бы один контакт'
})

const isClientNameInvalid = computed(() => clientNameTouched.value && clientNameError.value !== null)
const isClientEmailInvalid = computed(() => clientEmailTouched.value && clientEmailError.value !== null)
const isClientTgInvalid = computed(() => clientTgTouched.value && clientTgError.value !== null)
const isProductsInvalid = computed(() => productsTouched.value && productsError.value !== null)
const isClientWhAppInvalid = computed(() => clientWhAppTouched.value && clientWhAppError.value !== null)
const isClientPhoneInvalid = computed(() => clientPhoneTouched.value && clientPhoneError.value !== null)
const isContactInvalid = computed(() => contactError.value !== null)


// Общая валидность формы
const isFormValid = computed(() => {
  return (
    validateClientName(clientName.value) === true &&
    validateProducts(selectedProducts.value) === true &&
    hasAtLeastOneContact.value &&
    ((clientPhone.value != '') ||
      (clientEmail.value ? validateEmail(clientEmail.value) === true : true) ||
      (clientWhApp.value != '') ||
      (clientTg.value ? validateTelegram(clientTg.value) === true : true))
  )
})


const onDialogHide = () => {
  resetForm()
}

const debouncedSearch = debounce((value: string) => {
  searchQuery.value = value
}, 300)

const disableSaveButton = computed(() => {
  return !(selectedProducts.value.length > 0 && clientName.value && (clientPhone.value || clientEmail.value || clientTg.value || clientWhApp.value))
})

const isProductSelected = (productId: string) => {
  return selectedProductIds.value.includes(productId)
}

const productOptions = computed(() => {
  return catalogStore.products
    .filter(product => product.stock > 0)
    .map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock
    }))
})

const selectedProductIds = computed({
  get: () => selectedProducts.value.map(p => p.id),
  set: (ids: string[]) => {
    // Обновляем selectedProducts на основе выбранных ID
    const newProducts = ids.map(id => {
      const existing = selectedProducts.value.find(p => p.id === id)
      if (existing) return existing

      const product = productOptions.value.find(p => p.id === id)
      return {
        ...product,
        quantity: 1
      }
    })
    selectedProducts.value = newProducts
  }
})

const openProductsDialog = (saleData: any) => {
  currentProducts.value = saleData.products || []
  currentTotalPrice.value = saleData.totalPrice || 0
  productsDialogVisible.value = true
}

// Общая сумма сделки
const totalPrice = computed(() => {
  return selectedProducts.value.reduce((sum, product) => {
    return sum + (product.price * product.quantity)
  }, 0)
})

const getSelectedProducts = (ids: string[] | undefined) => {
  if (!ids) return []
  return ids.map(id => {
    const found = selectedProducts.value.find(p => p.id === id)
    if (found) return found

    const product = productOptions.value.find(p => p.id === id)
    return product ? {
      ...product,
      quantity: 1
    } : {
      id,
      name: 'Неизвестный продукт',
      price: 0,
      quantity: 1
    }
  })
}

const removeProduct = (productId: string) => {
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== productId)
  selectedProductIds.value = selectedProductIds.value.filter(id => id !== productId)
}

const formatFirestoreDate = (date: Date | { toDate: () => Date } | { seconds: number } | undefined): string => {
  if (!date) return 'Нет данных'

  try {
    let jsDate: Date

    if (date instanceof Date) {
      jsDate = date
    } else if (typeof (date as any).toDate === 'function') {
      jsDate = (date as any).toDate()
    } else if ((date as any).seconds) {
      jsDate = new Date((date as any).seconds * 1000)
    } else {
      return 'Некорректная дата'
    }

    return jsDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (e) {
    console.error('Ошибка форматирования даты:', e)
    return 'Некорректная дата'
  }
}

const confirmRemoveSale = async (id: string): Promise<void> => {
  confirm.require({
    message: 'Вы точно хотите удалить?',
    header: 'Удаление сделки',
    icon: 'pi pi-info-circle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await salesStore.deleteSale(id);
        toast.add({
          severity: 'success',
          summary: 'Успешно',
          detail: 'Сделка удалена',
          life: 2000
        });
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить сделку',
          life: 2000
        });
        console.error('Ошибка удаления:', error);
      }
    }
  })
}

const lastEditedInfo = computed(() => {
  const sale = salesStore.sales.find((s) => s.id === editingSaleId.value)
  if (!sale || !sale.lastEditedDate) return ''

  try {
    let date: Date

    if (sale.lastEditedDate instanceof Date) {
      date = sale.lastEditedDate
    } else if (typeof (sale.lastEditedDate as any).toDate === 'function') {
      date = (sale.lastEditedDate as any).toDate()
    } else if ((sale.lastEditedDate as any).seconds) {
      date = new Date((sale.lastEditedDate as any).seconds * 1000)
    } else {
      return `${sale.lastEditedByName || 'Неизвестный'}, некорректная дата`
    }

    return `${sale.lastEditedByName || 'Неизвестный'}, ${date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`
  } catch (e) {
    console.error('Ошибка форматирования даты:', e)
    return `${sale.lastEditedByName || 'Неизвестный'}, некорректная дата`
  }
})

const filteredSales = computed(() => {
  if (!searchQuery.value) return salesStore.sales

  const query = searchQuery.value.toLowerCase()
  return salesStore.sales.filter((sale: any) => {
    return (
      (sale.clientName?.toLowerCase().includes(query)) ||
      (sale.products?.some((p: any) => p.name.toLowerCase().includes(query))) ||
      (sale.clientPhone?.toLowerCase().includes(query)) ||
      (sale.clientEmail?.toLowerCase().includes(query)) ||
      (sale.clientTg?.toLowerCase().includes(query)) ||
      (sale.clientWhApp?.toLowerCase().includes(query)) ||
      (sale.totalPrice?.toString().includes(query)) ||
      (sale.createdByName?.toLowerCase().includes(query)) ||
      ((sale.status === 'open' ? 'открыта' : 'закрыта').includes(query))
    )
  })
})

const copyToClipboard = (text: string, type: string) => {
  navigator.clipboard.writeText(text).then(() => {
    let typeName = '';
    switch (type) {
      case 'email': typeName = 'Email'; break;
      case 'phone': typeName = 'Телефон'; break;
      case 'whatsapp': typeName = 'WhatsApp'; break;
      case 'telegram': typeName = 'Telegram'; break;
    }

    toast.add({
      severity: 'success',
      summary: 'Скопировано',
      detail: `${typeName}: ${text}`,
      life: 3000
    });
  }).catch((err) => {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось скопировать',
      life: 3000
    });
    console.error('Ошибка копирования:', err);
  });
};

const openEditDialog = (sale: any) => {
  isEditing.value = true
  editingSaleId.value = sale.id
  selectedProducts.value = sale.products?.map((p: any) => {
    const product = catalogStore.products.find(prod => prod.id === p.id)
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      quantity: p.quantity || 1,
      stock: product?.stock || 0
    }
  }) || []
  clientName.value = sale.clientName
  clientPhone.value = sale.clientPhone
  clientEmail.value = sale.clientEmail
  clientWhApp.value = sale.clientWhApp
  clientTg.value = sale.clientTg
  status.value = sale.status
  visible.value = true
}

const saveSale = async () => {
  clientNameTouched.value = true
  productsTouched.value = true
  clientPhoneTouched.value = true
  clientEmailTouched.value = true
  clientWhAppTouched.value = true
  clientTgTouched.value = true

  if (!isFormValid.value) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка валидации',
      detail: 'Пожалуйста, заполните все обязательные поля',
      life: 2000
    })
    return
  }
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('Пользователь не авторизован')

    const userName = `${authStore.userInfo.firstName || ''} ${authStore.userInfo.lastName || ''}`.trim()
    const now = new Date()

    const saleData = {
      products: selectedProducts.value.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: p.quantity || 1
      })),
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientEmail: clientEmail.value,
      clientWhApp: clientWhApp.value,
      clientTg: clientTg.value,
      totalPrice: totalPrice.value,
      status: isEditing.value ? status.value : 'open',
      lastEditedByName: userName || 'Неизвестный',
      lastEditedDate: now
    }

    if (isEditing.value && editingSaleId.value) {
      await salesStore.updateSale(editingSaleId.value, saleData)
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Сделка обновлена',
        life: 2000
      })
    } else {
      await salesStore.addSale({
        ...saleData,
        createdBy: user.uid,
        createdByName: userName || 'Неизвестный',
        price: "",
      })
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Сделка добавлена',
        life: 2000
      })
    }

    visible.value = false
    resetForm()

    await Promise.all([
      salesStore.fetchAllSales(),
      catalogStore.fetchProducts()
    ])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error.message || 'Ошибка операции',
      life: 2000
    })
    console.error('Ошибка:', error)
  }
}

const resetForm = () => {
  selectedProducts.value = []
  selectedProductIds.value = []
  clientName.value = ''
  clientPhone.value = ''
  clientEmail.value = ''
  clientWhApp.value = ''
  clientTg.value = ''
  isEditing.value = false
  editingSaleId.value = ''
  status.value = 'open'

  clientNameTouched.value = false
  productsTouched.value = false
  clientPhoneTouched.value = false
  clientEmailTouched.value = false
  clientWhAppTouched.value = false
  clientTgTouched.value = false
}

watch(selectedProducts, (newVal) => {
  // Удаляем дубликаты, если они появились
  const uniqueProducts = newVal.reduce((acc, product) => {
    if (!acc.some(p => p.id === product.id)) {
      acc.push(product)
    }
    return acc
  }, [] as typeof newVal)

  if (uniqueProducts.length !== newVal.length) {
    selectedProducts.value = uniqueProducts
  }
}, { deep: true })

watch(status, async (newStatus, oldStatus) => {
  if (!isEditing.value || !editingSaleId.value) return

  try {
    if (newStatus === 'canceled' && oldStatus !== 'canceled') {
      // При изменении статуса на "отменена" возвращаем товары
      const sale = salesStore.sales.find(s => s.id === editingSaleId.value)
      if (sale?.products) {
        await salesStore.updateProductStocks(
          sale.products.map(p => ({ id: p.id, quantity: p.quantity || 1 })),
          'add'
        )
      }
    } else if (oldStatus === 'canceled' && newStatus !== 'canceled') {
      // При изменении статуса с "отменена" вычитаем товары
      const sale = salesStore.sales.find(s => s.id === editingSaleId.value)
      if (sale?.products) {
        await salesStore.updateProductStocks(
          sale.products.map(p => ({ id: p.id, quantity: p.quantity || 1 })),
          'remove'
        )
      }
    }
  } catch (error) {
    console.error('Ошибка обновления стока:', error)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось обновить количество товаров',
      life: 2000
    })
  }
})

onMounted(async () => {
  await Promise.all([
    salesStore.fetchAllSales(),
    catalogStore.fetchProducts()
  ])
})

</script>

<template>
  <app-confirmdialog />
  <div class="content p-4">
    <app-card>
      <template #content>

        <div class="flex justify-between items-center mb-6">
          <app-button @click="visible = true" class="px-4 py-2 text-white rounded">
            <i class="pi pi-plus" />
            <span class="hidden md:block">Добавить сделку</span>
          </app-button>

          <div class="w-64">
            <app-inputtext @input="debouncedSearch($event.target.value)" placeholder="Поиск по сделкам..."
              class="w-full p-2 border rounded" />
          </div>
        </div>


        <!-- Диалоговое окно -->
        <app-dialog v-model:visible="visible" modal maximizable
          :header="isEditing ? 'Редактирование сделки' : 'Новая сделка'" class="mx-auto w-2/3" @hide="onDialogHide" :pt="{
            headerActions: { class: 'ml-auto' },
            closeButton: { class: 'ml-2' }
          }">
          <div class="flex flex-col gap-4 p-4">
            <span class="block mb-2">Поля, помеченные *, обязательны для заполнения</span>

            <div class="field">
              <label class="block mb-2 font-medium">Продукты</label>
              <app-multiselect v-model="selectedProductIds" :options="productOptions" optionLabel="name"
                optionValue="id" filter placeholder="Выберите продукты*" display="chip"
                :class="{ 'p-invalid': isProductsInvalid }" @blur="productsTouched = true" class="h-[50px] w-full">
                <template #option="slotProps">
                  <div class="flex items-center justify-between w-full">
                    <div class="flex items-center gap-2">
                      <i class="pi pi-box text-blue-500" />
                      <span>{{ slotProps.option.name }}</span>
                      <span v-if="isProductSelected(slotProps.option.id)" class="text-green-500 text-xs ml-2">уже
                        выбрано</span>
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ slotProps.option.price }} ₽ (остаток: {{ slotProps.option.stock }})
                    </div>
                  </div>
                </template>

                <template #value="slotProps">
                  <div v-if="slotProps.value">
                    <div v-for="option of getSelectedProducts(slotProps.value)" :key="option.id"
                      class="inline-flex items-center gap-1 mr-2 bg-blue-100 rounded-full px-2 py-1">
                      <span>{{ option.name }}</span>
                      <span class="text-xs text-blue-600">({{ option.quantity || 1 }})</span>
                      <i class="pi pi-times-circle ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                        @click.stop="removeProduct(option.id)" />
                    </div>
                  </div>
                </template>

                <template #dropdownicon>
                  <i class="pi pi-chevron-down" />
                </template>

                <template #filtericon>
                  <i class="pi pi-search" />
                </template>

                <template #header>
                  <div class="font-medium px-3 py-2">Доступные продукты</div>
                </template>

                <template #footer>
                  <div class="flex justify-between p-3">
                    <div class="text-sm text-gray-500">
                      Выбрано: {{ selectedProducts.length }} продукт(ов)
                    </div>
                    <app-button label="Очистить все" severity="danger" text size="small" icon="pi pi-times"
                      @click.stop="resetForm" :disabled="selectedProducts.length === 0" />
                  </div>
                </template>
              </app-multiselect>
              <small v-if="isProductsInvalid" class="text-red-500 text-sm">
                {{ productsError }}
              </small>
            </div>

            <div v-if="selectedProducts.length > 0" class="grid grid-cols-1 gap-2">
              <div v-for="(product) in selectedProducts" :key="product.id" class="flex items-center gap-4">
                <span class="flex-1">{{ product.name }}</span>
                <app-inputnumber v-model="product.quantity" :min="1" :max="product.stock" showButtons class="w-24" />
                <span class="w-20 text-right">{{ product.price * product.quantity }} ₽</span>
              </div>
              <div class="border-t pt-2 mt-2 font-semibold text-right">
                Итого: {{ totalPrice }} ₽
              </div>
            </div>

            <div class="field">
              <app-inputtext v-model="clientName" placeholder="ФИО клиента *"
                :class="{ 'p-invalid': isClientNameInvalid }" @blur="clientNameTouched = true"
                class="w-full p-2 border rounded" />
              <small v-if="isClientNameInvalid" class="text-red-500 text-sm">
                {{ clientNameError }}
              </small>
            </div>

            <span>Контакты * (хотя бы один):</span>
            <small v-if="isContactInvalid" class="text-red-500 text-sm">
              {{ contactError }}
            </small>

            <div class="field">
              <app-inputmask v-model="clientPhone" placeholder="Номер для связи" mask="+7 (999) 999-99-99"
                :class="{ 'p-invalid': isClientPhoneInvalid }" @blur="clientPhoneTouched = true"
                class="w-full p-2 border rounded" />
              <small v-if="isClientPhoneInvalid" class="text-red-500 text-sm">
                {{ clientPhoneError }}
              </small>
            </div>

            <div class="field">
              <app-inputmask v-model="clientWhApp" placeholder="Номер WhatsApp" mask="+7 (999) 999-99-99"
                :class="{ 'p-invalid': isClientWhAppInvalid }" @blur="clientWhAppTouched = true"
                class="w-full p-2 border rounded" />
              <small v-if="isClientWhAppInvalid" class="text-red-500 text-sm">
                {{ clientWhAppError }}
              </small>
            </div>

            <div class="field">
              <app-inputtext v-model="clientEmail" placeholder="Email клиента"
                :class="{ 'p-invalid': isClientEmailInvalid }" @blur="clientEmailTouched = true"
                class="w-full p-2 border rounded" />
              <small v-if="isClientEmailInvalid" class="text-red-500 text-sm">
                {{ clientEmailError }}
              </small>
            </div>

            <div class="field">
              <app-inputtext v-model="clientTg" placeholder="Telegram клиента"
                :class="{ 'p-invalid': isClientTgInvalid }" @blur="clientTgTouched = true"
                class="w-full p-2 border rounded" />
              <small v-if="isClientTgInvalid" class="text-red-500 text-sm">
                {{ clientTgError }}
              </small>
            </div>

            <div v-if="isEditing">
              <span>Статус сделки:</span>
              <div class="flex gap-4">
                <div class="flex items-center">
                  <app-radiobutton v-model="status" inputId="status-open" value="open" />
                  <label for="status-open" class="ml-2">Открыта</label>
                </div>
                <div class="flex items-center">
                  <app-radiobutton v-model="status" inputId="status-closed" value="closed" />
                  <label for="status-closed" class="ml-2">Закрыта</label>
                </div>
                <div class="flex items-center">
                  <app-radiobutton v-model="status" inputId="status-canceled" value="canceled" />
                  <label for="status-canceled" class="ml-2">Отменена</label>
                </div>
              </div>
              <div class="text-sm text-gray-500 mt-4">
                <div>Последнее изменение:</div>
                <div>{{ lastEditedInfo }}</div>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
              <app-button label="Отмена" severity="secondary" @click="visible = false"
                class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded" />
              <app-button :label="isEditing ? 'Сохранить изменения' : 'Добавить сделку'" @click="saveSale"
                :disabled="disableSaveButton" class="px-4 py-2 text-white rounded" />
            </div>
          </div>
        </app-dialog>

        <template v-if="salesStore.loading">
          <Loader class="flex justify-between items-center" />
        </template>

        <app-message v-else-if="!salesStore.sales.length" severity="info" icon="pi pi-question-circle"
          variant="outlined">Список
          сделок пуст. Пожалуйста добавьте сделку
          по
          кнопке "Добавить"</app-message>

        <!-- Таблица -->
        <div v-else class="mt-6">
          <h2 class="text-xl font-semibold mb-4">Список сделок</h2>
          <app-datatable :value="filteredSales" paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
            :loading="salesStore.loading" :pt="{
              bodyRow: { class: 'hover:bg-gray-50' }
            }">
            <app-column field="clientName" header="Клиент" class="p-3"></app-column>
            <app-column header="Контакты" class="p-3">
              <template #body="slotProps">
                <div class="gap-2 w-full">
                  <!-- Email -->
                  <span v-if="slotProps.data.clientEmail" @click="copyToClipboard(slotProps.data.clientEmail, 'email')"
                    class="m-1 cursor-pointer text-blue-600 hover:text-blue-700 transition-colors p-1 rounded-full bg-blue-100 hover:bg-blue-200"
                    :title="`Email: ${slotProps.data.clientEmail}`">
                    <span class="pi pi-at text-xl"></span>
                  </span>

                  <!-- Телефон -->
                  <span v-if="slotProps.data.clientPhone" @click="copyToClipboard(slotProps.data.clientPhone, 'phone')"
                    class="m-1 cursor-pointer text-green-600 hover:text-green-700 transition-colors p-1 rounded-full bg-green-100 hover:bg-green-200"
                    :title="`Телефон: ${slotProps.data.clientPhone}`">
                    <span class="pi pi-phone text-xl"></span>
                  </span>

                  <!-- WhatsApp -->
                  <span v-if="slotProps.data.clientWhApp"
                    @click="copyToClipboard(slotProps.data.clientWhApp, 'whatsapp')"
                    class="m-1 cursor-pointer text-green-500 hover:text-green-600 transition-colors p-1 rounded-full bg-green-100 hover:bg-green-200"
                    :title="`WhatsApp: ${slotProps.data.clientWhApp}`">
                    <span class="pi pi-whatsapp text-xl"></span>
                  </span>

                  <!-- Telegram -->
                  <span v-if="slotProps.data.clientTg" @click="copyToClipboard(slotProps.data.clientTg, 'telegram')"
                    class="m-1 cursor-pointer text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-full bg-blue-100 hover:bg-blue-200"
                    :title="`Telegram: ${slotProps.data.clientTg}`">
                    <span class="pi pi-telegram text-xl"></span>
                  </span>
                </div>
              </template>
            </app-column>
            <app-column header="Заказ" class="p-3">
              <template #body="{ data }">
                <div v-if="data.products && data.products.length > 0">
                  <app-button class="hover:bg-blue-50" outlined icon="pi pi-list" severity="secondary"
                    @click="openProductsDialog(data)" v-tooltip.top="'Показать список заказа'" />
                </div>
                <span v-else>-</span>
              </template>
            </app-column>
            <app-column field="totalPrice" header="Сумма" class="p-3">
              <template #body="{ data }">
                {{ data.totalPrice }} ₽
              </template>
            </app-column>
            <app-column field="createdByName" header="Сотрудник" class="p-3"></app-column>
            <app-column field="createdDate" header="Дата" class="p-3">
              <template #body="{ data }">
                {{ formatFirestoreDate(data.createdDate) }}
              </template>
            </app-column>
            <app-column field="status" header="Статус" class="p-3">
              <template #body="{ data }">
                <app-tag :severity="statusOptions.find(s => s.value === data.status)?.severity || 'info'"
                  :value="statusOptions.find(s => s.value === data.status)?.label || data.status">
                </app-tag>
              </template>
            </app-column>
            <app-column>
              <template #body="slotProps">
                <div class="flex gap-2">
                  <app-button icon="pi pi-pencil" severity="info" @click="openEditDialog(slotProps.data)" />
                  <app-button icon="pi pi-trash" severity="danger" @click="confirmRemoveSale(slotProps.data.id)" />
                </div>
              </template>
            </app-column>
          </app-datatable>
        </div>
      </template>
    </app-card>
  </div>

  <app-dialog v-model:visible="productsDialogVisible" header="Список продуктов" modal
    class="max-w-md rounded-lg shadow-xl" :pt="{
      root: { class: 'bg-white' },
      header: { class: 'border-b border-gray-200 px-6 py-4' },
      content: { class: 'p-0' },
      footer: { class: 'border-t border-gray-200 px-6 py-4 flex justify-end' }
    }">
    <div class="divide-y divide-gray-200">
      <div v-for="product in currentProducts" :key="product.id"
        class="flex justify-between items-center px-6 py-3 hover:bg-gray-50 transition-colors">
        <span class="text-gray-800 font-medium truncate max-w-[200px]">
          {{ product.name }}
        </span>
        <span class="text-gray-600 font-semibold whitespace-nowrap">
          {{ product.quantity || 1 }} шт
        </span>
      </div>
    </div>

    <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
      <div class="flex justify-between items-center">
        <span class="text-gray-600">Итого:</span>
        <span class="text-lg font-bold text-gray-800 ">
          {{ currentTotalPrice }} ₽
        </span>
      </div>
    </div>

    <template #footer>
      <app-button label="Закрыть" severity="secondary" @click="productsDialogVisible = false"
        class="px-4 py-2 rounded-md" />
    </template>
  </app-dialog>

</template>

<style scoped></style>