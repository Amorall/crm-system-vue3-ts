import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { IProduct } from '@/utils/interfaces'
import { getAuth } from 'firebase/auth'
import { useExpensesStore } from './expenses'
import { deleteFromCloudinary, extractPublicId } from '@/utils/cloudinaryUploader'

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<IProduct[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')
  const uploadingImage = ref<boolean>(false)

  const storage = getStorage()

  const uploadImage = async (file: File): Promise<string> => {
    const auth = getAuth()
    if (!auth.currentUser) {
      throw new Error('Требуется авторизация')
    }
    uploadingImage.value = true
    try {
      // Убедитесь, что имя файла не содержит запрещенных символов
      const fileName = `products/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`
      const fileRef = storageRef(storage, fileName)

      // Добавьте метаданные с content-type
      const metadata = {
        contentType: file.type,
      }

      await uploadBytes(fileRef, file, metadata)
      return await getDownloadURL(fileRef)
    } catch (err) {
      console.error('Error uploading image:', err)
      throw new Error('Не удалось загрузить изображение')
    } finally {
      uploadingImage.value = false
    }
  }

  const deleteImage = async (url: string) => {
    try {
      if (!url) return

      const publicId = extractPublicId(url)
      if (publicId) {
        await deleteFromCloudinary(publicId)
      }
    } catch (err) {
      console.error('Error deleting image:', err)
      throw err
    }
  }

  const fetchProducts = async () => {
    loading.value = true
    error.value = ''
    try {
      const db = getFirestore()
      const querySnapshot = await getDocs(collection(db, 'products'))
      products.value = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as IProduct,
      )
    } catch (err) {
      error.value = 'Ошибка загрузки каталога'
      console.error('Error fetching products:', err)
    } finally {
      loading.value = false
    }
  }

  const addProduct = async (product: Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const db = getFirestore()
      const id = uuidv4()
      const newProduct: IProduct = {
        ...product,
        id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      await setDoc(doc(db, 'products', id), newProduct)
      products.value = [...products.value, newProduct]
      if (product.stock > 0 && product.purchasePrice > 0) {
        const expensesStore = useExpensesStore()
        await expensesStore.addExpense({
          amount: product.stock * product.purchasePrice,
          type: 'product',
          description: `Закупка нового товара - ${product.name} (${product.stock} шт.)`,
          productId: id,
        })
      }
      console.log('Adding product:', newProduct)
      return newProduct
    } catch (err) {
      error.value = 'Ошибка добавления продукта'
      console.error('Error adding product:', err)
      throw err
    }
  }
  const updateProduct = async (id: string, updates: Partial<IProduct>) => {
    try {
      const db = getFirestore()
      const product = products.value.find((p) => p.id === id)

      if (updates.imageUrl === null || updates.imageUrl === undefined) {
        if (product?.imageUrl) {
          await deleteImage(product.imageUrl)
        }
      }

      if (
        product &&
        typeof updates.stock !== 'undefined' &&
        updates.stock > product.stock &&
        product.purchasePrice > 0
      ) {
        const addedStock = updates.stock - product.stock
        const expensesStore = useExpensesStore()
        await expensesStore.addExpense({
          amount: addedStock * product.purchasePrice,
          type: 'product',
          description: `Пополнение склада - ${product.name} (+${addedStock} шт.)`,
          productId: id,
        })
      }

      await updateDoc(doc(db, 'products', id), {
        ...updates,
        updatedAt: Timestamp.now(),
      })

      products.value = products.value.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p,
      )
      console.log('Updating product:', updates)
    } catch (err) {
      error.value = 'Ошибка обновления продукта'
      console.error('Error updating product:', err)
      throw err
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      const db = getFirestore()
      const product = products.value.find((p) => p.id === id)

      if (product?.imageUrl) {
        await deleteImage(product.imageUrl)
      }

      await deleteDoc(doc(db, 'products', id))
      products.value = products.value.filter((p) => p.id !== id)
    } catch (err) {
      error.value = 'Ошибка удаления продукта'
      console.error('Error deleting product:', err)
      throw err
    }
  }

  return {
    products,
    loading,
    error,
    uploadingImage,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
    deleteImage,
  }
})
