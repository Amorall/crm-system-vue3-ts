<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getAuth } from 'firebase/auth'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore } from '@/stores/sales'
import { useToast } from 'primevue/usetoast';

const authStore = useAuthStore()
const salesStore = useSalesStore()
const toast = useToast()

// Реактивные данные формы
const productName = ref<string>('')
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientEmail = ref<string>('')
const clientWhApp = ref<string>('')
const clientTg = ref<string>('')
const price = ref<string>('')
const visible = ref<boolean>(false)

// Пагинация
const currentPage = ref<number>(1)
const rowsPerPage = ref<number>(10)

const disableSaveButton = computed(() => {
  return !(productName.value && clientName.value && price.value && (clientPhone.value || clientEmail.value || clientTg.value || clientWhApp.value))
})

const copyToClipboard = (text: string, type: string) => {
  navigator.clipboard.writeText(text).then(() => {
    let typeName = '';
    switch(type) {
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

const addNewSale = async (): Promise<void> => {
  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) throw new Error('Пользователь не авторизован')

    // Получаем имя пользователя
    const userName = `${authStore.userInfo.firstName || ''} ${authStore.userInfo.lastName || ''}`.trim();
    const saleData = {
      productName: productName.value,
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientEmail: clientEmail.value,
      clientWhApp: clientWhApp.value,
      clientTg: clientTg.value,
      price: price.value,
      createdByName: userName || 'Неизвестный',
      lastEditedByName: userName || 'Неизвестный'
    }

    await salesStore.addSale(saleData)

    // Очистка формы
    productName.value = ''
    clientName.value = ''
    clientPhone.value = ''
    clientEmail.value = ''
    clientTg.value = ''
    clientWhApp.value = ''
    price.value = ''
    visible.value = false

    if (currentPage.value === 1) {
      await salesStore.fetchSales(rowsPerPage.value);
    }

  } catch (error) {
    console.error("Error in addNewSale:", error)
  }
}

const onPageChange = async (event: any) => {
  if (!salesStore.hasMore && event.page > 0) return

  await salesStore.fetchSales(
    rowsPerPage.value,
    event.page > 0 ? salesStore.lastVisibleDoc : null
  )
}

onMounted(async () => {
  await salesStore.fetchSales(rowsPerPage.value)
})

</script>

<template>
  <div class="content p-4">
    <app-card>
      <template #content>
        <!-- Кнопка и поиск -->
        <div class="flex justify-between items-center mb-6">
          <app-button @click="visible = true" class="px-4 py-2 text-white rounded">
            <i class="pi pi-plus" />
            <span class="hidden md:block">Добавить продажу</span>
          </app-button>

          <div class="w-64">
            <app-inputtext placeholder="Поиск по продажам..." class="w-full p-2 border rounded" />
          </div>
        </div>


        <!-- Диалоговое окно -->
        <app-dialog v-model:visible="visible" modal header="Форма продаж" class="max-w-md mx-auto" :pt="{
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

            <div class="flex justify-end gap-2 mt-4">
              <app-button label="Отмена" severity="secondary" @click="visible = false"
                class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded" />
              <app-button label="Добавить продажу" @click="addNewSale" :disabled="disableSaveButton"
                :loading="salesStore.adding" class="px-4 py-2 text-white rounded" />
            </div>
          </div>
        </app-dialog>

        <!-- Таблица продаж -->
        <div class="mt-6">
          <h2 class="text-xl font-semibold mb-4">Список продаж</h2>
          <app-datatable :value="salesStore.sales" class="w-full" paginator :rows="rowsPerPage"
            :totalRecords="salesStore.totalRecords" :rowsPerPageOptions="[5, 10, 20, 50]" @page="onPageChange"
            :loading="salesStore.loading" :pt="{
              table: { class: 'min-w-full' },
              headerRow: { class: 'bg-gray-200' },
              bodyRow: { class: 'hover:bg-gray-50' }
            }">
            <app-column field="clientName" header="Клиент" sortable class="p-3"></app-column>
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
            <app-column field="productName" header="Продукт" sortable class="p-3"></app-column>
            <app-column field="price" header="Сумма" sortable class="p-3">
              <template #body="{ data }">
                {{ data.price }} ₽
              </template>
            </app-column>
            <app-column field="createdByName" header="Сотрудник" sortable class="p-3"></app-column>
            <app-column field="createdDate" header="Дата" sortable class="p-3">
              <template #body="{ data }">
                {{ data.createdDate?.toDate ? data.createdDate.toDate().toLocaleDateString() :
                  new Date(data.createdDate?.seconds * 1000).toLocaleDateString() }}
              </template>
            </app-column>
          </app-datatable>
        </div>
      </template>
    </app-card>
  </div>
</template>

<style scoped></style>