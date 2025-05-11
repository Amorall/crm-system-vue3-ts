<script setup lang="ts">
import { onMounted, ref} from "vue"
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from "./stores/auth"
import AppHeader from "@/components/header.vue"
import Toast from 'primevue/toast'
import Loader from './components/loader.vue';

const authStore = useAuthStore() 
const isLoading = ref<boolean>(true)

 onMounted(() => {
  onAuthStateChanged(getAuth(), (user) => {
    if (user) {
      console.log("User is signed in:", user);

      authStore.userInfo.userId = user.uid
      authStore.userInfo.email = user.email
    } else {
      authStore.userInfo.userId = ''
    }
    isLoading.value = false
  })
 })

</script>

<template>
  <Loader v-if="isLoading"/>
    <div v-else class="container min-h-screen w-screen bg-gray-100">
    <app-header />
    <div class="content">
      <Toast />
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.container{
  max-width: 100%;
  max-height: 100%;
}
</style>
