<template>
  <Icon :icon="'openmoji:' + name" :width="size" :height="size" />
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 }
})
</script>
