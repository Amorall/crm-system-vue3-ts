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
} from 'firebase/firestore'
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import type { IProduct } from '@/utils/interfaces'
import { getAuth } from 'firebase/auth'

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
      // Извлекаем public_id из URL Cloudinary
      const publicId = url.split('/').slice(-2).join('/').split('.')[0]
      // Здесь нужно добавить вызов API Cloudinary для удаления изображения
      // Например, используя axios или fetch
      const response = await fetch(`/api/delete-image?public_id=${publicId}`)
      if (!response.ok) throw new Error('Failed to delete image')
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
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, 'products', id), newProduct)
      products.value = [...products.value, newProduct]
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

      await updateDoc(doc(db, 'products', id), {
        ...updates,
        updatedAt: new Date(),
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
