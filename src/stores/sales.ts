import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { v4 as uuidv4 } from 'uuid'
import type { IIncomes } from '@/utils/interfaces'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<IIncomes[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  const fetchAllSales = async () => {
    loading.value = true
    error.value = ''
    try {
      const db = getFirestore()
      const q = query(collection(db, 'incomes'), orderBy('createdDate', 'desc'))

      const snapshot = await getDocs(q)
      sales.value = snapshot.docs.map((doc) => doc.data() as IIncomes)
    } catch (err) {
      error.value = 'Ошибка загрузки'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const addSale = async (saleData: Omit<IIncomes, 'id' | 'createdDate'>) => {
    loading.value = true
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) throw new Error('Пользователь не авторизован')

      const db = getFirestore()
      const saleId = uuidv4()

      // Получаем данные пользователя из Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      const userName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        : 'Неизвестный'

      const newSale: IIncomes = {
        ...saleData,
        id: saleId,
        createdDate: new Date(),
        createdBy: user.uid,
        createdByName: userName,
        lastEditedBy: user.uid,
        lastEditedByName: userName,
        status: saleData.status || 'open',
        lastEditedDate: new Date(),
      }

      await setDoc(doc(db, 'incomes', saleId), newSale)
      return newSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSale = async (id: string, saleData: Partial<IIncomes>) => {
    loading.value = true
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) throw new Error('Пользователь не авторизован')

      const db = getFirestore()

      // Получаем текущие данные продажи
      const saleRef = doc(db, 'incomes', id)
      const saleDoc = await getDoc(saleRef)
      if (!saleDoc.exists()) throw new Error('Продажа не найдена')

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      const userName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        : 'Неизвестный'
      // Обновляем данные
      const updatedSale = {
        ...saleDoc.data(),
        ...saleData,
        lastEditedBy: user.uid,
        lastEditedByName: userName,
        lastEditedDate: new Date(),
      }

      await setDoc(saleRef, updatedSale, { merge: true })
      await fetchAllSales() // Обновляем список
      return updatedSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSale = async (id: string) => {
    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'incomes', id))
      // Обновляем список продаж после удаления
      await fetchAllSales()
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  return {
    sales,
    loading,
    error,
    fetchAllSales,
    addSale,
    deleteSale,
    updateSale,
  }
})
