<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAuth } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore } from '@/stores/sales'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { debounce } from 'lodash-es'
import Loader from '../../components/loader.vue'

const authStore = useAuthStore()
const salesStore = useSalesStore()
const toast = useToast()
const confirm = useConfirm()

// Реактивные данные формы
const productName = ref<string>('')
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientEmail = ref<string>('')
const clientWhApp = ref<string>('')
const clientTg = ref<string>('')
const price = ref<string>('')
const editingSaleId = ref<string>('')
const searchQuery = ref<string>('')
const status = ref<string>('open')
const visible = ref<boolean>(false)
const isEditing = ref(false)

const onDialogHide = () => {
  resetForm()
}

const debouncedSearch = debounce((value: string) => {
  searchQuery.value = value
}, 300)

const disableSaveButton = computed(() => {
  return !(productName.value && clientName.value && price.value && (clientPhone.value || clientEmail.value || clientTg.value || clientWhApp.value))
})

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
  const sale = salesStore.sales.find((s: { id: string }) => s.id === editingSaleId.value)
  if (!sale) return ''
  
  const date = sale.lastEditedDate?.toDate 
    ? sale.lastEditedDate.toDate().toLocaleString() 
    : new Date(sale.lastEditedDate?.seconds * 1000).toLocaleString()
  
  return `${sale.lastEditedByName || 'Неизвестный'}, ${date}`
})

const filteredSales = computed(() => {
  if (!searchQuery.value) return salesStore.sales

  const query = searchQuery.value.toLowerCase()
  return salesStore.sales.filter((sale: any) => {
    return (
      (sale.clientName?.toLowerCase().includes(query)) ||
      (sale.productName?.toLowerCase().includes(query)) ||
      (sale.clientPhone?.toLowerCase().includes(query)) ||
      (sale.clientEmail?.toLowerCase().includes(query)) ||
      (sale.clientTg?.toLowerCase().includes(query)) ||
      (sale.clientWhApp?.toLowerCase().includes(query)) ||
      (sale.price?.toString().includes(query)) ||
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
  productName.value = sale.productName
  clientName.value = sale.clientName
  clientPhone.value = sale.clientPhone
  clientEmail.value = sale.clientEmail
  clientWhApp.value = sale.clientWhApp
  clientTg.value = sale.clientTg
  price.value = sale.price
  status.value = sale.status
  visible.value = true
}

const saveSale = async () => {
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('Пользователь не авторизован')

    const userName = `${authStore.userInfo.firstName || ''} ${authStore.userInfo.lastName || ''}`.trim()
    const now = new Date()

    const saleData = {
      productName: productName.value,
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientEmail: clientEmail.value,
      clientWhApp: clientWhApp.value,
      clientTg: clientTg.value,
      price: price.value,
      status: isEditing.value ? status.value : 'open',
      lastEditedByName: userName || 'Неизвестный',
      lastEditedDate: now
    }

    if (isEditing.value && editingSaleId.value) {
      await salesStore.updateSale(editingSaleId.value, saleData)
      toast.add({ severity: 'success', summary: 'Успешно', detail: 'Сделка обновлена', life: 2000 })
    } else {
        const newSale = await salesStore.addSale({
        ...saleData,
        createdBy: user.uid,
        createdByName: userName || 'Неизвестный',
      })
      toast.add({ severity: 'success', summary: 'Успешно', detail: 'Сделка добавлена', life: 2000 })
    }

    visible.value = false
    resetForm()

    await salesStore.fetchAllSales()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Ошибка операции', life: 2000 })
    console.error('Ошибка:', error)
  }
}

const resetForm = () => {
  productName.value = ''
  clientName.value = ''
  clientPhone.value = ''
  clientEmail.value = ''
  clientWhApp.value = ''
  clientTg.value = ''
  price.value = ''
  isEditing.value = false
  editingSaleId.value = ''
  status.value = 'open'
}

onMounted(async () => {
  await salesStore.fetchAllSales()
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
        <app-dialog v-model:visible="visible" modal :header="isEditing ? 'Редактирование сделки' : 'Новая сделка'"
          class="max-w-md mx-auto" @hide="onDialogHide" :pt="{
            headerActions: { class: 'ml-auto' },
            closeButton: { class: 'ml-2' }
          }">
          <span class="block mb-2">В поле "контакты" достаточно указать хотя бы один.</span>
          <div class="flex flex-col gap-4 p-4">
            <span>Общая информация:</span>
            <app-inputtext v-model="productName" placeholder="Название продукта" class="w-full p-2 border rounded" />
            <app-inputtext v-model="clientName" placeholder="ФИО клиента" class="w-full p-2 border rounded" />
            <app-inputtext v-model="price" placeholder="Стоимость" suffix=" ₽" class="w-full p-2 border rounded" />
            <span>Контакты:</span>
            <app-inputmask v-model="clientPhone" placeholder="Номер для связи" mask="+7 (999) 999-99-99"
              class="w-full p-2 border rounded" />
            <app-inputmask v-model="clientWhApp" placeholder="Номер WhatsApp" mask="+7 (999) 999-99-99"
              class="w-full p-2 border rounded" />
            <app-inputtext v-model="clientEmail" placeholder="Email клиента" class="w-full p-2 border rounded" />
            <app-inputtext v-model="clientTg" placeholder="Telegram клиента" class="w-full p-2 border rounded" />
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
            <app-column field="productName" header="Продукт" class="p-3"></app-column>
            <app-column field="price" header="Сумма" class="p-3">
              <template #body="{ data }">
                {{ data.price }} ₽
              </template>
            </app-column>
            <app-column field="createdByName" header="Сотрудник" class="p-3"></app-column>
            <app-column field="createdDate" header="Дата" class="p-3">
              <template #body="{ data }">
                {{ data.createdDate?.toDate ? data.createdDate.toDate().toLocaleDateString() :
                  new Date(data.createdDate?.seconds * 1000).toLocaleDateString() }}
              </template>
            </app-column>
            <app-column field="status" header="Статус" class="p-3">
              <template #body="{ data }">
                <app-tag :severity="data.status === 'open' ? 'success' : 'danger'"
                  :value="data.status === 'open' ? 'Открыта' : 'Закрыта'">
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
</template>

<style scoped></style>