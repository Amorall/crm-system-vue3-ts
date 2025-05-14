import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<any[]>([]);
  const loading = ref(false);
  const error = ref('');

  const fetchEmployees = async () => {
    loading.value = true;
    try {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, 'users'));
      employees.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        name: `${doc.data().lastName} ${doc.data().firstName}`
      }));
    } catch (err) {
      error.value = 'Ошибка загрузки сотрудников';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  return { employees, loading, error, fetchEmployees };
});