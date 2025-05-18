<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useCatalogStore } from '@/stores/catalog';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { uploadToCloudinaryClient } from '@/utils/cloudinaryUploader';
import type { IProduct } from '@/utils/interfaces';

import ProgressBar from 'primevue/progressbar';

type SortableField = keyof Omit<IProduct, 'createdAt' | 'updatedAt'>;

const catalogStore = useCatalogStore();
const authStore = useAuthStore();
const confirm = useConfirm();
const toast = useToast();

const { addProduct, updateProduct, deleteProduct } = catalogStore;

const products = computed(() => catalogStore.products);
const loading = ref<boolean>(false);
const error = ref<string>('');
const showAddDialog = ref<boolean>(false);
const editingProduct = ref<IProduct | null>(null);
const saving = ref<boolean>(false);
const uploadingImage = ref<boolean>(false);
const searchQuery = ref<string>('');
const selectedFile = ref<File | null>(null);
const tempUploadedImages = ref<string[]>([]);
const sortKey = ref();
const sortOrder = ref();
const sortField = ref<SortableField>();
const selectedCategory = ref<string | null>(null);
const selectedStockStatus = ref<string | null>(null);
const newCategory = ref<string>('');
const fileUploadRef = ref();
const showNewCategoryConfirmation = ref<boolean>(false);

const sortOptions = ref([
  { label: 'Цена по убыванию', value: '!price' },
  { label: 'Цена по возрастанию', value: 'price' },
]);

const stockStatusOptions = ref([
  { label: 'Много', value: 'many' },
  { label: 'Мало', value: 'few' },
  { label: 'Нет в наличии', value: 'none' }
]);

const productForm = ref({
  name: '',
  description: '',
  price: 0,
  purchasePrice: 0,
  stock: 0,
  category: '',
  imageUrl: '',
})

const errors = ref({
  name: '',
  description: '',
  price: '',
  purchasePrice: '',
  stock: '',
  category: '',
});

const touched = ref({
  name: false,
  description: false,
  price: false,
  purchasePrice: false,
  stock: false,
  category: false,
  imageUrl: false
});

const isFormValid = computed(() => {
  return (
    productForm.value.name.trim() &&
    productForm.value.description.trim() &&
    productForm.value.price > 0 &&
    productForm.value.purchasePrice > 0 &&
    productForm.value.stock >= 0 &&
    productForm.value.category.trim() &&
    (editingProduct.value ? true : productForm.value.imageUrl) &&
    productForm.value.purchasePrice <= productForm.value.price
  );
});

const resetValidation = () => {
  touched.value = {
    name: false,
    description: false,
    price: false,
    purchasePrice: false,
    stock: false,
    category: false,
    imageUrl: false
  };
  
  errors.value = {
    name: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '',
    category: '',
  };
};

const validateForm = () => {
  let isValid = true;
  errors.value = {
    name: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '',
    category: '',
  };

  // Проверка названия
  if (!productForm.value.name.trim()) {
    errors.value.name = 'Название обязательно';
    isValid = false;
  } else if (products.value.some(p =>
    p.name.toLowerCase() === productForm.value.name.toLowerCase() &&
    (!editingProduct.value || p.id !== editingProduct.value.id)
  )) {
    errors.value.name = 'Товар с таким названием уже существует';
    isValid = false;
    toast.add({
      severity: 'warn',
      summary: 'Предупреждение',
      detail: 'Товар с таким названием уже существует',
      life: 3000
    });
  }

  // Проверка описания
  if (!productForm.value.description.trim()) {
    errors.value.description = 'Описание обязательно';
    isValid = false;
  } else if (productForm.value.description.length > 500) {
    errors.value.description = 'Описание не должно превышать 500 символов';
    isValid = false;
  }

  // Проверка цены
  if (productForm.value.purchasePrice <= 0) {
    errors.value.purchasePrice = 'Закупочная цена должна быть больше 0';
    isValid = false;
  } else if (productForm.value.purchasePrice > productForm.value.price) {
    errors.value.purchasePrice = 'Закупочная цена не может быть больше цены продажи';
    isValid = false;
  }

  if (productForm.value.price <= 0) {
    errors.value.price = 'Цена должна быть больше 0';
    isValid = false;
  }

  // Проверка количества
  if (productForm.value.stock < 0) {
    errors.value.stock = 'Количество не может быть отрицательным';
    isValid = false;
  }

  // Проверка категории
  if (!productForm.value.category?.trim()) {
    errors.value.category = 'Категория обязательна';
    isValid = false;
  }

  return isValid;
};

const handleBlur = (field: keyof typeof touched.value) => {
  touched.value[field] = true;
  validateForm();
};

const onFileSelect = (event: { files: File[] }) => {
  selectedFile.value = event.files[0];
};

const onFileClear = () => {
  selectedFile.value = null;
};

const uploadImage = async () => {
  if (!selectedFile.value) return;

  uploadingImage.value = true;
  try {
    const imageUrl = await uploadToCloudinaryClient(selectedFile.value);
    productForm.value.imageUrl = imageUrl;
    tempUploadedImages.value.push(imageUrl); // Запоминаем временное изображение
    toast.add({
      severity: 'success',
      summary: 'Успех',
      detail: 'Изображение загружено',
      life: 3000
    });
    onFileClear();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: (error as { message?: string }).message || 'Не удалось загрузить изображение',
      life: 3000
    });
  } finally {
    uploadingImage.value = false;
  }
};

const removeImage = async () => {
  if (!productForm.value.imageUrl) return;

  try {
    if (tempUploadedImages.value.includes(productForm.value.imageUrl) ||
      (editingProduct.value && editingProduct.value.imageUrl !== productForm.value.imageUrl)) {
      await catalogStore.deleteImage(productForm.value.imageUrl);
    }
    productForm.value.imageUrl = '';
    toast.add({
      severity: 'success',
      summary: 'Успех',
      detail: 'Изображение удалено',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось удалить изображение',
      life: 3000
    });
  }
};

const hasAdminAccess = computed(() => {
  return authStore.userInfo?.permission && authStore.userInfo.permission >= 2;
});

const categories = computed(() => {
  const cats = new Set<string>();
  products.value.forEach(p => cats.add(p.category));
  return Array.from(cats);
});

// Фильтруем продукты по выбранной категории и наличию
const filteredProducts = computed(() => {
  let result = [...products.value];

  // Фильтрация по категории
  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value);
  }

  // Фильтрация по наличию
  if (selectedStockStatus.value) {
    if (selectedStockStatus.value === 'many') {
      result = result.filter(p => p.stock > 10);
    } else if (selectedStockStatus.value === 'few') {
      result = result.filter(p => p.stock > 0 && p.stock <= 10);
    } else if (selectedStockStatus.value === 'none') {
      result = result.filter(p => p.stock === 0);
    }
  }

  // Поиск по названию и описанию
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  // Сортировка
  if (sortField.value) {
    result.sort((a, b) => {
      const field = sortField.value as keyof IProduct;
      const valA = a[field];
      const valB = b[field];

      // Добавим проверку типов для сравнения
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder.value * (valA - valB);
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder.value * valA.localeCompare(valB);
      }

      return 0;
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
      showNewCategoryConfirmation.value = true;
      newCategory.value = '';
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Новая категория добавлена',
        life: 3000
      });
    } else {
      toast.add({
        severity: 'warn',
        summary: 'Предупреждение',
        detail: 'Такая категория уже существует',
        life: 3000
      });
    }
  } else {
    // Если категория пустая
    showNewCategoryConfirmation.value = false;
  }
};

const resetNewCategory = () => {
  productForm.value.category = '';
  newCategory.value = '';
  showNewCategoryConfirmation.value = false;
};

watch(
  () => productForm.value.category,
  (newVal) => {
    if (newVal && categories.value.includes(newVal)) {
      showNewCategoryConfirmation.value = false;
    }
  }
);

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
    purchasePrice: product.purchasePrice,
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl || '',
  };
  showAddDialog.value = true;
};

const closeDialog = async () => {
  // Удаляем временные изображения если форма не была сохранена
  if (tempUploadedImages.value.length > 0) {
    try {
      await Promise.all(
        tempUploadedImages.value.map(url => catalogStore.deleteImage(url))
      )
    } catch (error) {
      console.error('Error cleaning temp images:', error);
    }
  }

  showAddDialog.value = false;
  editingProduct.value = null;
  tempUploadedImages.value = []; // Очищаем временные изображения
  resetForm();
  resetValidation();
};

const resetForm = () => {
  productForm.value = {
    name: '',
    description: '',
    price: 0,
    purchasePrice: 0,
    stock: 0,
    category: '',
    imageUrl: '',
  };
  newCategory.value = '';
};

const saveProduct = async () => {
  // Помечаем все поля как touched перед валидацией
  Object.keys(touched.value).forEach(key => {
    touched.value[key as keyof typeof touched.value] = true;
  });

  if (!validateForm()) return;

  saving.value = true;
  try {
    const productData = {
      ...productForm.value,
      imageUrl: productForm.value.imageUrl,
      updatedAt: new Date(),
    };

    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, productData);
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Продукт успешно обновлен',
        life: 3000
      });
    } else {
      await addProduct({
        ...productData,
        imageUrl: productForm.value.imageUrl
      });
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Продукт успешно добавлен',
        life: 3000
      });
    }
    tempUploadedImages.value = [];
    closeDialog();
  } catch (err) {
    console.error('Ошибка сохранения продукта:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить продукт',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: string) => {
  confirm.require({
    message: 'Вы уверены, что хотите удалить этот продукт?',
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteProduct(id);
        toast.add({
          severity: 'success',
          summary: 'Успешно',
          detail: 'Продукт успешно удален',
          life: 3000
        });
      } catch (err) {
        console.error('Ошибка удаления продукта:', err);
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: 'Не удалось удалить продукт',
          life: 3000
        });
      }
    },
    reject: () => { }
  });
};

const getStockStatus = (stock: number) => {
  if (stock > 10) return { label: 'Много', severity: 'success' };
  if (stock > 0) return { label: 'Мало', severity: 'warning' };
  return { label: 'Нет в наличии', severity: 'danger' };
};

const resetFilters = () => {
  selectedCategory.value = null;
  selectedStockStatus.value = null;
  searchQuery.value = '';
};
</script>

<template>
  <div class="content p-4">
    <app-confirmdialog />

    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Каталог средств защиты информации</h1>
      <app-button v-if="hasAdminAccess && products.length != 0" @click="showAddDialog = true" :disabled="loading">
        <i class="pi pi-plus" />
        <span class="w-[206px] hidden md:block">Добавить продукт</span>
      </app-button>
    </div>

    <ProgressBar v-if="loading" mode="indeterminate" class="h-1 mb-4" style="height: 4px" />
    <app-message v-if="error" severity="error" class="mb-4">{{ error }}</app-message>

    <div class="mb-6">
      <!-- Main Filters Row -->
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <div class="flex-1 flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-500 mb-1">Категория</label>
            <app-select v-model="selectedCategory" :options="categories" placeholder="Все категории" class="w-full">
              <template #option="slotProps">
                <span class="capitalize">{{ slotProps.option }}</span>
              </template>
            </app-select>
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-500 mb-1">Наличие</label>
            <app-select v-model="selectedStockStatus" :options="stockStatusOptions" optionLabel="label"
              optionValue="value" placeholder="Любое" class="w-full" />
          </div>

          <div class="flex items-end">
            <app-button icon="pi pi-filter-slash" severity="secondary" @click="resetFilters"
              v-tooltip="'Сбросить все фильтры'" class="h-[42px]" />
          </div>
        </div>

        <div class="w-full md:w-64">
          <label class="block text-sm font-medium text-gray-500 mb-1">Поиск товаров</label>
          <app-inputgroup>
            <app-inputgroupaddon>
              <i class="pi pi-search"></i>
            </app-inputgroupaddon>
            <app-inputtext v-model="searchQuery" placeholder="Поиск..." class="w-full" />
          </app-inputgroup>
        </div>
      </div>

      <!-- Sorting Row -->
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-500 mb-1">Сортировка:</label>
        <app-selectbutton v-model="sortKey" :options="sortOptions" optionLabel="label" @change="onSortChange"
          class="border-none">
          <template #option="slotProps">
            <div class="flex items-center gap-2">
              <i class="pi"
                :class="slotProps.option.value === 'price' ? 'pi-sort-amount-up' : 'pi-sort-amount-down'"></i>
              <span>{{ slotProps.option.label }}</span>
            </div>
          </template>
        </app-selectbutton>
      </div>
    </div>

    <div v-if="!loading && products.length === 0" class="text-center py-10">
      <p class="text-gray-500">Каталог пуст</p>
      <app-button v-if="hasAdminAccess" icon="pi pi-plus" label="Добавить первый продукт" @click="showAddDialog = true"
        class="mt-4" />
    </div>

    <app-dataview v-show="!loading && products.length > 0" :value="filteredProducts" :sortOrder="sortOrder"
      :sortField="sortField">
      <template #list="slotProps">
        <div class="flex flex-col">
          <div v-for="(item, index) in slotProps.items" :key="item.id">
            <div class="flex flex-col sm:flex-row sm:items-center p-6 gap-4"
              :class="{ 'border-t border-surface-200': index !== 0 }">
              <div class="md:w-40 relative">
                <img v-if="item.imageUrl" class="block xl:block mx-auto rounded w-full" :src="item.imageUrl"
                  :alt="item.name" />
                <div v-else class="w-full h-40 bg-surface-100 flex items-center justify-center rounded">
                  <i class="pi pi-image text-4xl text-surface-400"></i>
                </div>
                <div class="absolute bg-black/70 rounded" style="left: 4px; top: 4px">
                  <app-tag :value="`${item.stock} шт`" :severity="getStockStatus(item.stock).severity"></app-tag>
                </div>
              </div>
              <div class="flex flex-col md:flex-row justify-between md:items-center flex-1 gap-6">
                <div class="flex flex-row md:flex-col justify-between items-start gap-2">
                  <div>
                    <span class="font-medium text-surface-500 text-sm capitalize">{{ item.category }}</span>
                    <div class="text-lg font-medium mt-2">{{ item.name }}</div>
                    <p class="text-surface-600 mt-2">{{ item.description }}</p>
                  </div>
                  <app-tag :value="getStockStatus(item.stock).label" :severity="getStockStatus(item.stock).severity"
                    class="mt-2" />
                </div>
                <div class="flex flex-col md:items-end gap-8">
                  <span class="text-xl font-semibold">{{ item.price }} ₽</span>
                  <div class="flex flex-row-reverse md:flex-row gap-2">
                    <app-button v-if="hasAdminAccess" icon="pi pi-pencil" label="Редактировать" severity="info"
                      @click="editProduct(item)" class="flex-auto md:flex-initial whitespace-nowrap" />
                    <app-button v-if="hasAdminAccess" icon="pi pi-trash" label="Удалить" severity="danger"
                      @click="handleDelete(item.id)" class="flex-auto md:flex-initial whitespace-nowrap" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </app-dataview>

    <!-- Диалог добавления/редактирования -->
    <app-dialog v-model:visible="showAddDialog" :header="editingProduct ? 'Редактировать продукт' : 'Добавить продукт'"
      modal class="w-full md:w-1/2" @hide="closeDialog">
      <div class="grid grid-cols-1 gap-4">
        <!-- Поле для загрузки изображения -->
        <div class="field">
          <label class="block mb-2 font-medium">Изображение товара<span v-if="!editingProduct"
              class="text-red-500">*</span></label>
          <div v-if="productForm.imageUrl" class="mb-4 relative group">
            <img :src="productForm.imageUrl" class="w-full h-48 object-cover rounded-lg border border-gray-200"
              alt="Превью" />
            <button @click="removeImage"
              class="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-90 hover:opacity-100">
              <i class="pi pi-trash text-xs"></i>
            </button>
          </div>

          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <app-fileupload ref="fileUploadRef" mode="basic" name="productImage" accept="image/*" :maxFileSize="1000000"
              :multiple="false" :auto="false" chooseLabel="Выбрать файл" @select="onFileSelect">
            </app-fileupload>

            <div v-if="selectedFile" class="mt-3 flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <i class="pi pi-image text-xl text-primary-500"></i>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ (selectedFile.size / 1024).toFixed(1) }} KB</p>
              </div>
              <button @click="onFileClear" class="text-red-500 hover:text-red-700">
                <i class="pi pi-times"></i>
              </button>
            </div>

            <app-button v-if="selectedFile" label="Загрузить" icon="pi pi-cloud-upload" @click="uploadImage"
              :loading="uploadingImage" class="w-full mt-3" />

            <small class="text-xs text-gray-500 block mt-2">
              Поддерживаются JPG, PNG. Максимальный размер: 1MB
            </small>
          </div>
        </div>

        <div class="field">
          <label for="name" class="block mb-2 font-medium">Название <span class="text-red-500">*</span></label>
          <app-inputtext id="name" v-model="productForm.name" class="w-full"
            :class="{ 'p-invalid': (touched.name && errors.name) }" @blur="handleBlur('name')" />
          <small v-if="touched.name && errors.name" class="p-error text-red-500">{{ errors.name }}</small>
        </div>


        <div class="field">
          <label for="description" class="block mb-2 font-medium">Описание <span class="text-red-500">*</span></label>
          <app-textarea id="description" v-model="productForm.description" rows="3" class="w-full"
            :class="{ 'p-invalid': (touched.description && errors.description) }" @blur="handleBlur('description')" />
          <div class="flex justify-between">
            <small v-if="touched.description && errors.description" class="p-error text-red-500">{{ errors.description
            }}</small>
            <small :class="{ 'text-red-500': productForm.description.length > 500 }">
              {{ productForm.description.length }}/500
            </small>
          </div>
        </div>

        <!-- Поля цены и количества -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label for="price" class="block mb-2 font-medium">Цена продажи<span class="text-red-500">*</span></label>
            <app-inputnumber id="price" v-model="productForm.price" mode="currency" currency="RUB" locale="ru-RU"
              class="w-full" :class="{ 'p-invalid': (touched.price && errors.price) }" @blur="handleBlur('price')" />
            <small v-if="touched.price && errors.price" class="p-error text-red-500">{{ errors.price }}</small>
          </div>

          <div class="field">
            <label for="purchasePrice" class="block mb-2 font-medium">Закупочная цена<span
                class="text-red-500">*</span></label>
            <app-inputnumber id="purchasePrice" v-model="productForm.purchasePrice" mode="currency" currency="RUB"
              locale="ru-RU" class="w-full" :min="0"
              :class="{ 'p-invalid': (touched.purchasePrice && errors.purchasePrice) }"
              @blur="handleBlur('purchasePrice')" />
            <small v-if="touched.purchasePrice && errors.purchasePrice" class="p-error text-red-500">{{
              errors.purchasePrice
            }}</small>
          </div>

          <div class="field">
            <label for="stock" class="block mb-2 font-medium">Остаток на складе <span
                class="text-red-500">*</span></label>
            <app-inputnumber id="stock" v-model="productForm.stock" class="w-full"
              :class="{ 'p-invalid': (touched.stock && errors.stock) }" @blur="handleBlur('stock')" />
            <small v-if="touched.stock && errors.stock" class="p-error text-red-500">{{ errors.stock }}</small>
          </div>
        </div>

        <!-- Поле категории -->
        <div class="field">
          <label class="block mb-2 font-medium">Категория <span class="text-red-500">*</span></label>

          <app-select v-model="productForm.category" :options="categories" placeholder="Выберите категорию"
            class="w-full mb-2" :filter="true" :class="{ 'p-invalid': (touched.category && errors.category) }"
            optionLabel="" showClear @blur="handleBlur('category')" @clear="resetNewCategory" />

          <div
            v-if="!productForm.category || (!categories.includes(productForm.category) && productForm.category !== '')">
            <div class="flex gap-2 mb-2">
              <app-inputtext v-model="newCategory" placeholder="Введите новую категорию" class="flex-1"
                :class="{ 'p-invalid': (touched.category && errors.category) }" />
              <app-button icon="pi pi-plus" severity="secondary" @click="addNewCategory"
                v-tooltip="'Добавить новую категорию'" />
            </div>
          </div>

          <div v-if="showNewCategoryConfirmation && productForm.category && !categories.includes(productForm.category)"
            class="p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2 text-sm">
            <i class="pi pi-check-circle"></i>
            <span>Вы добавили категорию "{{ productForm.category }}". Она будет присвоена текущему товару.</span>
          </div>
           <small v-if="touched.category && errors.category" class="p-error text-red-500">{{ errors.category }}</small>
        </div>
      </div>

      <template #footer>
        <app-button label="Отмена" icon="pi pi-times" @click="closeDialog" severity="secondary" />
        <app-button :label="editingProduct ? 'Обновить' : 'Добавить'" icon="pi pi-check" @click="saveProduct"
          :loading="saving" :disabled="!isFormValid"/>
      </template>
    </app-dialog>
  </div>
</template>

<style scoped>
:deep(.p-selectbutton .p-button) {
  border-radius: 6px !important;
  padding: 0.5rem 1rem;
}

:deep(.p-selectbutton .p-button:not(:first-of-type)) {
  border-left: 1px solid var(--surface-border);
}

@media (max-width: 640px) {
  :deep(.p-fileupload-choose) {
    padding: 0.5rem;
  }

  :deep(.p-button-label) {
    font-size: 0.875rem;
  }
}
</style>