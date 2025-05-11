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
  increment,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { v4 as uuidv4 } from 'uuid'
import type { IIncome } from '@/utils/interfaces'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<IIncome[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  const fetchAllSales = async () => {
    loading.value = true
    error.value = ''
    try {
      const db = getFirestore()
      const q = query(collection(db, 'incomes'), orderBy('createdDate', 'desc'))

      const snapshot = await getDocs(q)
      sales.value = snapshot.docs.map((doc) => doc.data() as IIncome)
    } catch (err) {
      error.value = 'Ошибка загрузки'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const addSale = async (saleData: Omit<IIncome, 'id' | 'createdDate'>) => {
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

      const newSale: IIncome = {
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
      await updateUserStats(user.uid, 'add', saleData.status)
      return newSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSale = async (id: string, saleData: Partial<IIncome>) => {
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
      if (saleData.status && saleData.status !== saleDoc.data().status) {
        await updateUserStats(saleDoc.data().createdBy, 'remove', saleDoc.data().status)
        await updateUserStats(user.uid, 'add', saleData.status)
      }

      await setDoc(saleRef, updatedSale, { merge: true })
      await fetchAllSales()
      return updatedSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUserStats = async (userId: string, action: 'add' | 'remove', status: string) => {
  const db = getFirestore()
  const userRef = doc(db, 'users', userId)
  
  await setDoc(userRef, {
    stats: {
      totalSales: increment(action === 'add' ? 1 : -1),
      [status === 'open' ? 'openSales' : 'closedSales']: increment(action === 'add' ? 1 : -1)
    }
  }, { merge: true })
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
