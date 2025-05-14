<template>
  <div class="flex flex-col items-start p-3 rounded-lg" :class="color">
    <div class="flex items-center gap-2 mb-1">
      <i :class="icon" class="text-lg"></i>
      <span class="text-sm font-medium">{{ title }}</span>
    </div>
    <div class="text-xl font-bold">
      {{ displayValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: String,
  value: {
    type: [Number, String],
    required: true
  },
  icon: String,
  color: String,
  isPercentage: Boolean,
  isUnits: Boolean
})

// Вычисляемое свойство для отображения значения
const displayValue = computed(() => {
  if (props.isPercentage) return `${props.value}%`
  if (props.isUnits) return `${props.value} поз.`
  return formatCurrency(Number(props.value))
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}
</script>