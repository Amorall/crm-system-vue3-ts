<script setup lang="ts">
import AppHeader from "@/components/header.vue"
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuthStore } from "./stores/auth"
import { onMounted } from "vue"

const authStore = useAuthStore() 


</script>

<template>
    <div class="container min-h-screen w-screen bg-gray-100">
    <app-header></app-header>
    <div class="content">
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
