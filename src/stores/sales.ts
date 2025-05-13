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
  increment,
  Timestamp,
  writeBatch,
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
      sales.value = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          ...data,
          id: doc.id,
          createdDate: data.createdDate?.toDate?.() || data.createdDate,
          lastEditedDate: data.lastEditedDate?.toDate?.() || data.lastEditedDate,
        } as IIncome
      })
    } catch (err) {
      error.value = 'Ошибка загрузки'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const updateProductStocks = async (products: Array<{id: string, quantity: number}>, action: 'add' | 'remove') => {
  const db = getFirestore();
  const batch = writeBatch(db);
  
  for (const product of products) {
    const productRef = doc(db, 'products', product.id);
    const productDoc = await getDoc(productRef);
    
    if (productDoc.exists()) {
      const currentStock = productDoc.data().stock || 0;
      const newStock = action === 'add' 
        ? currentStock + product.quantity
        : currentStock - product.quantity;
      
      if (newStock < 0) {
        throw new Error(`Недостаточно товара ${productDoc.data().name} на складе`);
      }
      
      batch.update(productRef, { stock: newStock });
    }
  }
  
  await batch.commit();
}

  const addSale = async (saleData: Omit<IIncome, 'id' | 'createdDate'>) => {
    loading.value = true
    try {
      const auth = getAuth()
      const user = auth.currentUser
      if (!user) throw new Error('Пользователь не авторизован')

      const db = getFirestore()
      const saleId = uuidv4()

      // Получаем данные пользователя
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      const userName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        : 'Неизвестный'

      const newSale: IIncome = {
        ...saleData,
        id: saleId,
        createdDate: Timestamp.now(),
        createdBy: user.uid,
        createdByName: userName,
        lastEditedBy: user.uid,
        lastEditedByName: userName,
        status: saleData.status || 'open',
        lastEditedDate: Timestamp.now(),
      }

      // Используем транзакцию
      const batch = writeBatch(db)
      batch.set(doc(db, 'incomes', saleId), newSale)

      // Обновляем статистику
      batch.set(
        doc(db, 'users', user.uid),
        {
          stats: {
            totalSales: increment(1),
            [newSale.status === 'open' ? 'openSales' : 'closedSales']: increment(1),
          },
        },
        { merge: true },
      )

      // Вычитаем товары (если статус не "отменена")
      if (newSale.status !== 'canceled' && newSale.products) {
        await updateProductStocks(
          newSale.products.map((p) => ({ id: p.id, quantity: p.quantity || 1 })),
          'remove',
        )
      }

      await batch.commit()
      return newSale
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
    }
  }

 const updateSale = async (id: string, saleData: Partial<IIncome>) => {
  loading.value = true;
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Пользователь не авторизован');

    const db = getFirestore();
    const saleRef = doc(db, 'incomes', id);
    const saleDoc = await getDoc(saleRef);
    if (!saleDoc.exists()) throw new Error('Продажа не найдена');

    const oldSale = saleDoc.data() as IIncome;
    const newStatus = saleData.status || oldSale.status;
    const newProducts = saleData.products || oldSale.products || [];

    // Получаем данные пользователя
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    const userName = userData
      ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
      : 'Неизвестный';

    // Обновляем данные
    const updatedSale = {
      ...oldSale,
      ...saleData,
      lastEditedBy: user.uid,
      lastEditedByName: userName,
      lastEditedDate: Timestamp.now(),
    };

    // Используем транзакцию
    const batch = writeBatch(db);
    batch.set(saleRef, updatedSale, { merge: true });

    // Обработка изменения статуса
    if (oldSale.status !== newStatus) {
      console.log(`Status changed from ${oldSale.status} to ${newStatus}`);

      // Если меняем на canceled - возвращаем товары
      if (newStatus === 'canceled' && oldSale.status !== 'canceled') {
        console.log('Adding products back to stock');
        await updateProductStocks(
          oldSale.products.map(p => ({ id: p.id, quantity: p.quantity || 1 })),
          'add'
        );
      }
      // Если меняем с canceled - вычитаем товары
      else if (oldSale.status === 'canceled' && newStatus !== 'canceled') {
        console.log('Removing products from stock');
        await updateProductStocks(
          newProducts.map(p => ({ id: p.id, quantity: p.quantity || 1 })),
          'remove'
        );
      }
    }

    // Обновляем статистику пользователя
    if (oldSale.status !== newStatus) {
      batch.set(doc(db, 'users', oldSale.createdBy), {
        stats: {
          [oldSale.status === 'open' ? 'openSales' : 'closedSales']: increment(-1),
          [newStatus === 'open' ? 'openSales' : 'closedSales']: increment(1)
        }
      }, { merge: true });
    }

    await batch.commit();
    await fetchAllSales();
    return updatedSale;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    loading.value = false;
  }
}

  const deleteSale = async (id: string) => {
    loading.value = true
    try {
      const db = getFirestore()
      const saleRef = doc(db, 'incomes', id)
      const saleDoc = await getDoc(saleRef)
      if (!saleDoc.exists()) throw new Error('Продажа не найдена')

      const saleData = saleDoc.data() as IIncome

      const batch = writeBatch(db)
      batch.delete(saleRef)

      // Возвращаем товары если сделка была открыта
      if (saleData.status === 'open' && saleData.products) {
        await updateProductStocks(
          saleData.products.map((p) => ({ id: p.id, quantity: p.quantity || 1 })),
          'add',
        )
      }

      // Обновляем статистику
      batch.set(
        doc(db, 'users', saleData.createdBy),
        {
          stats: {
            totalSales: increment(-1),
            [saleData.status === 'open' ? 'openSales' : 'closedSales']: increment(-1),
          },
        },
        { merge: true },
      )

      await batch.commit()
      await fetchAllSales()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      loading.value = false
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
    updateProductStocks,
  }
})
