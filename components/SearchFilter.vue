<template>
  <div class="flex flex-row gap-4 py-4 pr-4">
    <div class="grow flex relative">
      <img src="/img/db/icon-search.svg" alt="Search" class="absolute z-10 top-[50%] translate-y-[-50%] px-4" />
      <input type="text" class="rounded-full bg-neutral-200 text-left p-4 px-12 grow z-0 relative" placeholder="Search for a DAW, VST, Plugin or Software" />
    </div>
    <button class="bg-neutral-100 hover:bg-neutral-200 rounded-md px-4 p-2 cursor-pointer">Filter & Sort</button>
    <button @click="$emit('open-modal')" class="bg-neutral-100 hover:bg-neutral-200 rounded-md px-4 p-2 cursor-pointer">Submit Resource</button>
  </div>
</template>