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
import type { IProduct } from '@/utils/interfaces'

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<IProduct[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

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
      console.log('Products after update:', products.value);
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
      products.value = [...products.value, newProduct];
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
      await updateDoc(doc(db, 'products', id), {
        ...updates,
        updatedAt: new Date(),
      })

      products.value = products.value.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p,
      )
    } catch (err) {
      error.value = 'Ошибка обновления продукта'
      console.error('Error updating product:', err)
      throw err
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      const db = getFirestore()
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
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  }
})
