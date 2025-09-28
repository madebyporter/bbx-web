<template>
  <NuxtLayout>
    <NuxtPage 
      @edit-resource="$emit('edit-resource', $event)"
      @show-signup="$emit('show-signup')"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
defineEmits(['edit-resource', 'show-signup'])
</script>