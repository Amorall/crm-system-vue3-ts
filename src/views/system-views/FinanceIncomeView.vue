<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { getFirestore, setDoc, doc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import type { IIncomes } from '../../utils/interfaces'

const db = getFirestore()
const authStore = useAuthStore();

const productName = ref<string>('')
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientEmail = ref<string>('')
const price = ref<string>('')
const createdDate = ref<string>('')
const showloader = ref<boolean>(false)

const addNewSale = async (): Promise<void> => {
  showloader.value = true;
  try {
    const payload: IIncomes = {
      id: uuidv4(),
      productName: productName.value,
      clientName: clientName.value,
      clientPhone: clientPhone.value,
      clientEmail: clientEmail.value,
      price: price.value,
      createdDate: new Date(),
    };

    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    await setDoc(doc(db, `users/${userId}/incomes`, payload.id), payload);
    console.log("Document successfully written!");
  } catch (error) {
    console.error("Error in addNewSale:", error);
  } finally {
    showloader.value = false;
  }
};
const disableSaveButton = computed<boolean>(() => {
  return !(productName.value && clientName.value && clientPhone.value && price.value)
})

</script>

<template>
  <div class="content">
    <app-card>
      <template #title></template>
      <template #content>
        <app-inputtext class="input mb-3" placeholder="Название продукта" v-model="productName" />
        <app-inputtext v-model="clientName" class="input mb-3" placeholder="ФИО клиента" />
        <app-inputtext v-model="clientPhone" class="input mb-3" placeholder="Номер для связи с клиентом" />
        <app-inputtext v-model="clientEmail" class="input mb-3" placeholder="email клиента" />
        <app-inputtext v-model="price" class="input mb-3" placeholder="Стоимость" />
        <app-inputtext v-model="createdDate" class="input mb-3" placeholder="Дата сделки" />
        <app-button @click="addNewSale" label="Добавить продажу" :disabled="disableSaveButton" class="w-full"
          icon="pi pi-plus" iconPos="left"></app-button>
      </template>
    </app-card>
  </div>
</template>

<style scoped></style>