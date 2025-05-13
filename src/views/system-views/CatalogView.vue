<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useCatalogStore } from '@/stores/catalog';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from 'primevue/useconfirm';
import type { IProduct } from '@/utils/interfaces';

import InputNumber from 'primevue/inputnumber';
import SelectButton from 'primevue/selectbutton';
import ProgressBar from 'primevue/progressbar';


const catalogStore = useCatalogStore();
const authStore = useAuthStore();
const confirm = useConfirm();

const { addProduct, updateProduct, deleteProduct } = catalogStore;

const products = computed(() => catalogStore.products);
const loading = ref(false);
const error = ref('');
const showAddDialog = ref(false);
const editingProduct = ref<IProduct | null>(null);
const saving = ref(false);

const sortKey = ref();
const sortOrder = ref();
const sortField = ref();
const selectedCategory = ref<string | null>(null);
const newCategory = ref('');

const sortOptions = ref([
  {label: 'Цена по убыванию', value: '!price'},
  {label: 'Цена по возрастанию', value: 'price'},
]);


const productForm = ref({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: '',
  features: [] as string[],
});

const hasAdminAccess = computed(() => {
  return authStore.userInfo?.permission && authStore.userInfo.permission >= 2;
});

const categories = computed(() => {
  const cats = new Set<string>();
  products.value.forEach(p => cats.add(p.category));
  return Array.from(cats);
});

// Фильтруем продукты по выбранной категории
const filteredProducts = computed(() => {
  let result = [...products.value];
  
  // Фильтрация по категории
  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value);
  }
  
  // Сортировка
  if (sortField.value) {
    result.sort((a, b) => {
      const valA = a[sortField.value];
      const valB = b[sortField.value];
      return sortOrder.value * (valA > valB ? 1 : -1);
    });
  }
  
  return result;
});

// Обработчик изменения сортировки
const onSortChange = (event: { value: { value: any; }; }) => {
  const value = event.value.value;
  
  if (value.indexOf('!') === 0) {
    sortOrder.value = -1;
    sortField.value = value.substring(1, value.length);
  } else {
    sortOrder.value = 1;
    sortField.value = value;
  }
  sortKey.value = event.value;
};

// Добавление новой категории
const addNewCategory = () => {
  if (newCategory.value.trim()) {
    if (!categories.value.includes(newCategory.value.trim())) {
      productForm.value.category = newCategory.value.trim();
      newCategory.value = '';
    }
  }
};


// Загрузка продуктов
const loadProducts = async () => {
  loading.value = true;
  error.value = '';
  try {
    await catalogStore.fetchProducts();
  } catch (err) {
    error.value = 'Ошибка загрузки продуктов';
    console.error('Ошибка загрузки продуктов:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await authStore.loadUserProfile();
  await loadProducts();
});

watch(
  () => catalogStore.products,
  (newProducts) => {
    console.log('Products updated:', newProducts);
  },
  { deep: true }
);

const editProduct = (product: IProduct) => {
  editingProduct.value = product;
  productForm.value = {
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    category: product.category,
    features: [...product.features],
  };
  showAddDialog.value = true;
};

const closeDialog = () => {
  showAddDialog.value = false;
  editingProduct.value = null;
  resetForm();
};

const resetForm = () => {
  productForm.value = {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: 'software',
    features: [],
  };
  newCategory.value = '';
};

const saveProduct = async () => {
  saving.value = true;
  try {
    const productData = {
      ...productForm.value,
      updatedAt: new Date(),
    };

    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, productData);
    } else {
      await addProduct({
        ...productData,
        createdAt: new Date(),
      });
    }
    closeDialog();
  } catch (err) {
    console.error('Ошибка сохранения продукта:', err);
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: string) => {
  confirm.require({
    message: 'Вы уверены, что хотите удалить этот продукт?',
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await deleteProduct(id);
      } catch (err) {
        console.error('Ошибка удаления продукта:', err);
      }
    },
    reject: () => {}
  });
};

const getSeverity = (product: IProduct) => {
  if (product.stock > 10) return 'success';
  if (product.stock > 0) return 'warning';
  return 'danger';
};
</script>

<template>
  <div class="content p-4">
    <app-confirmdialog />
    
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Каталог средств защиты информации</h1>
      <app-button 
        v-if="hasAdminAccess"
        icon="pi pi-plus" 
        label="Добавить продукт"
        @click="showAddDialog = true"
        :disabled="loading"
      />
    </div>

     <ProgressBar 
      v-if="loading" 
      mode="indeterminate" 
      class="h-1 mb-4"
      style="height: 4px"
    />
    <app-message v-if="error" severity="error" class="mb-4">{{ error }}</app-message>

    <div class="flex flex-wrap gap-4 mb-6">
      <div class="flex items-center gap-2">
        <span class="font-medium">Категория:</span>
        <app-select 
          v-model="selectedCategory" 
          :options="categories" 
          placeholder="Все категории"
          class="min-w-[200px]"
        >
          <template #option="slotProps">
            <span class="capitalize">{{ slotProps.option }}</span>
          </template>
        </app-select>
      </div>
      
      <div class="flex items-center gap-2">
        <span class="font-medium">Сортировка:</span>
        <app-select 
          v-model="sortKey" 
          :options="sortOptions" 
          optionLabel="label" 
          placeholder="Сортировать по..."
          @change="onSortChange"
          class="min-w-[200px]"
        />
      </div>
    </div>

    <div v-if="!loading && products.length === 0" class="text-center py-10">
      <p class="text-gray-500">Каталог пуст</p>
      <app-button 
        v-if="hasAdminAccess"
        icon="pi pi-plus" 
        label="Добавить первый продукт" 
        @click="showAddDialog = true"
        class="mt-4"
      />
    </div>

    <app-dataview v-show="!loading && products.length > 0" :value="filteredProducts" 
      :sortOrder="sortOrder"
      :sortField="sortField">
      <template #list="slotProps">
        <div class="flex flex-col">
          <div v-for="(item, index) in slotProps.items" :key="item.id">
            <div class="flex flex-col sm:flex-row sm:items-center p-6 gap-4" :class="{ 'border-t border-surface-200': index !== 0 }">
              <div class="md:w-40 relative">
                <img 
                  v-if="item.imageUrl"
                  class="block xl:block mx-auto rounded w-full" 
                  :src="item.imageUrl" 
                  :alt="item.name" 
                />
                <div 
                  v-else
                  class="w-full h-40 bg-surface-100 flex items-center justify-center rounded"
                >
                  <i class="pi pi-image text-4xl text-surface-400"></i>
                </div>
                <div class="absolute bg-black/70 rounded" style="left: 4px; top: 4px">
                  <app-tag :value="`${item.stock} шт`" :severity="getSeverity(item)"></app-tag>
                </div>
              </div>
              <div class="flex flex-col md:flex-row justify-between md:items-center flex-1 gap-6">
                <div class="flex flex-row md:flex-col justify-between items-start gap-2">
                  <div>
                    <span class="font-medium text-surface-500 text-sm capitalize">{{ item.category }}</span>
                    <div class="text-lg font-medium mt-2">{{ item.name }}</div>
                    <p class="text-surface-600 mt-2">{{ item.description }}</p>
                  </div>
                  <div class="bg-surface-100 p-1" style="border-radius: 30px">
                    <div class="bg-surface-0 flex items-center gap-2 justify-center py-1 px-2" style="border-radius: 30px; box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.04), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)">
                      <span class="text-surface-900 font-medium text-sm">{{ item.price }}</span>
                      <i class="pi pi-ruble-sign text-surface-900"></i>
                    </div>
                  </div>
                </div>
                <div class="flex flex-col md:items-end gap-8">
                  <span class="text-xl font-semibold">{{ item.price }} ₽</span>
                  <div class="flex flex-row-reverse md:flex-row gap-2">
                    <app-button 
                      icon="pi pi-shopping-cart" 
                      label="В корзину" 
                      :disabled="item.stock === 0" 
                      class="flex-auto md:flex-initial whitespace-nowrap"
                    />
                    <app-button 
                      v-if="hasAdminAccess"
                      icon="pi pi-pencil" 
                      severity="secondary"
                      @click="editProduct(item)"
                    />
                    <app-button 
                      v-if="hasAdminAccess"
                      icon="pi pi-trash" 
                      severity="danger"
                      @click="handleDelete(item.id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </app-dataview>

    <!-- Диалог добавления/редактирования -->
    <app-dialog 
      v-model:visible="showAddDialog" 
      :header="editingProduct ? 'Редактировать продукт' : 'Добавить продукт'"
      modal 
      class="w-full max-w-2xl"
    >
      <div class="grid grid-cols-1 gap-4">
        <div class="field">
          <label for="name" class="block mb-2 font-medium">Название</label>
          <app-inputtext id="name" v-model="productForm.name" class="w-full" />
        </div>
        
        <div class="field">
          <label for="description" class="block mb-2 font-medium">Описание</label>
          <app-textarea id="description" v-model="productForm.description" rows="3" class="w-full" />
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label for="price" class="block mb-2 font-medium">Цена</label>
            <InputNumber 
              id="price" 
              v-model="productForm.price" 
              mode="currency" 
              currency="RUB" 
              locale="ru-RU" 
              class="w-full"
            />
          </div>
          
          <div class="field">
            <label for="stock" class="block mb-2 font-medium">Остаток на складе</label>
            <InputNumber id="stock" v-model="productForm.stock" class="w-full" />
          </div>
        </div>
        
         <div class="field">
          <label class="block mb-2 font-medium">Категория</label>
          <div class="flex gap-2">
            <SelectButton 
              v-model="productForm.category" 
              :options="categories" 
              optionLabel=""
              class="flex-1"
            >
              <template #option="slotProps">
                <span class="capitalize">{{ slotProps.option }}</span>
              </template>
            </SelectButton>
            <app-button
              icon="pi pi-plus" 
              severity="secondary"
              @click="addNewCategory"
              v-tooltip="'Добавить новую категорию'"
            />
          </div>
          
           <div v-if="!categories.includes(productForm.category) || productForm.category === ''" class="mt-2">
          <app-inputtext
            v-model="newCategory"
            placeholder="Введите новую категорию"
            class="w-full"
          />
          <small class="text-gray-500">Введите название новой категории и нажмите "+"</small>
        </div>
      </div>
    </div>
      
      <template #footer>
        <app-button 
          label="Отмена" 
          icon="pi pi-times" 
          @click="closeDialog" 
          severity="secondary"
        />
        <app-button 
          :label="editingProduct ? 'Обновить' : 'Добавить'" 
          icon="pi pi-check" 
          @click="saveProduct"
          :loading="saving"
        />
      </template>
    </app-dialog>
  </div>
</template>