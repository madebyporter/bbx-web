<template>
  <div class="flex flex-row gap-4 py-4 pr-4">
    <div class="grow flex relative">
      <img src="/img/db/icon-search.svg" alt="Search" class="absolute z-10 top-[50%] translate-y-[-50%] px-4" />
      <input type="text" class="rounded-full bg-neutral-200 text-left p-4 px-12 grow z-0 relative" placeholder="Search for a DAW, VST, Plugin or Software" />
    </div>
    <button @click="$emit('open-filter-modal')" class="btn">Filter & Sort</button>
    <button @click="$emit('open-modal')" class="btn">Submit Resource</button>
  </div>
</template>

<script setup>
defineEmits(['open-modal', 'open-filter-modal'])
</script>