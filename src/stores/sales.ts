
import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  getCountFromServer,
  limit,
  startAfter,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { v4 as uuidv4 } from 'uuid'
import type { IIncomes } from '@/utils/interfaces'
import type { DocumentSnapshot } from 'firebase/firestore'

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<IIncomes[]>([])
  const loading = ref<boolean>(false)
  const adding = ref<boolean>(false)
  const error = ref<string>('')
  const lastVisibleDoc = ref<DocumentSnapshot | null>(null)
  const totalRecords = ref<number>(0)
  const hasMore = ref<boolean>(true)

 const fetchSales = async (itemsPerPage: number, startAfterDoc: DocumentSnapshot | null = null) => {
    loading.value = true
    error.value = ''
    try {
      const db = getFirestore()
      let q = query(
        collection(db, 'incomes'),
        orderBy('createdDate', 'desc'),
        limit(itemsPerPage)
      )

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc))
      }

      const snapshot = await getDocs(q)
      const countSnapshot = await getCountFromServer(collection(db, 'incomes'))

      // Обновляем данные
      sales.value = startAfterDoc 
        ? [...sales.value, ...snapshot.docs.map(doc => doc.data())]
        : snapshot.docs.map(doc => doc.data())

      lastVisibleDoc.value = snapshot.docs[snapshot.docs.length - 1] || null
      totalRecords.value = countSnapshot.data().count
      hasMore.value = snapshot.docs.length === itemsPerPage

      console.log('Fetched:', snapshot.docs.length, 'Has more:', hasMore.value)
    } catch (err) {
      error.value = 'Ошибка загрузки'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const addSale = async (saleData: Omit<IIncomes, 'id' | 'createdDate'>) => {
    adding.value = true
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
      }

      await setDoc(doc(db, 'incomes', saleId), newSale)
      return newSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      adding.value = false
    }
  }

  return {
    sales,
    loading,
    adding,
    error,
    totalRecords,
    lastVisibleDoc,
    hasMore,
    fetchSales,
    addSale,
  }
})
