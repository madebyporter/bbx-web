<template>
  <div class="col-span-full max-w-full lg:max-w-none p-2 lg:p-0 flex flex-col gap-8 text-neutral-300">
    <header class="pt-8 pb-4 border-b border-neutral-800">
      <h1 class="text-3xl font-bold indent-1">Music Production Software</h1>
    </header>
    <div class="overflow-x-scroll xl:overflow-auto">
      <Database 
        ref="database" 
        @edit-resource="$emit('edit-resource', $event)"
        @show-signup="$emit('show-signup')"
        :can-edit="isAdmin"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  name: 'index'
})

const { isAdmin } = useAuth()
const database = ref(null)

defineEmits(['edit-resource', 'show-signup'])

// Expose the database ref to parent
defineExpose({
  database,
  handleSearch: (query) => database.value?.handleSearch(query)
})
</script> 