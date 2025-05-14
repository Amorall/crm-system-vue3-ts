import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { v4 as uuidv4 } from 'uuid'
import type { IExpense, IExpenseCategory } from '@/utils/interfaces'
import { useCatalogStore } from './catalog'

  const categories: IExpenseCategory[] = [
    { value: 'product', label: 'Закупка товаров' },
    { value: 'marketing', label: 'Маркетинг' },
    { value: 'salary', label: 'Зарплаты' },
    { value: 'other', label: 'Прочие расходы' }
  ]

export const useExpensesStore = defineStore('expenses', () => {
  const expenses = ref<IExpense[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string>('')

  const fetchAllExpenses = async () => {
    loading.value = true
    error.value = ''
    try {
      const db = getFirestore()
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))

      const snapshot = await getDocs(q)
      expenses.value = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          date: data.date?.toDate?.() || data.date,
          lastEditedDate: data.lastEditedDate?.toDate?.() || data.lastEditedDate,
        } as IExpense
      })
    } catch (err) {
      error.value = 'Ошибка загрузки расходов'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const addExpense = async (expenseData: Omit<IExpense, 'id' | 'date' | 'createdBy' | 'createdByName'>) => {
  loading.value = true
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('Пользователь не авторизован')

    const db = getFirestore()
    const expenseId = uuidv4()

    // Получаем данные пользователя
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    const userData = userDoc.data()
    const userName = userData
      ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      : 'Неизвестный'

    const newExpense: any = {
      ...expenseData,
      id: expenseId,
      date: Timestamp.now(),
      createdBy: user.uid,
      createdByName: userName,
      lastEditedBy: user.uid,
      lastEditedByName: userName,
      lastEditedDate: Timestamp.now(),
    }

    await setDoc(doc(db, 'expenses', expenseId), newExpense)
    return newExpense
  } catch (err) {
    console.error(err)
    throw err
  } finally {
    loading.value = false
  }
}

const deleteExpense = async (id: string) => {
  loading.value = true;
  try {
    const db = getFirestore();
    await deleteDoc(doc(db, 'expenses', id));
    expenses.value = expenses.value.filter(expense => expense.id !== id);
    return true; // Успешное удаление
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    loading.value = false;
  }
};

  return {
    expenses,
    loading,
    error,
    categories,
    fetchAllExpenses,
    addExpense,
    deleteExpense,
  }
})