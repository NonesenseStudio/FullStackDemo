<template>
  <div class="flex min-h-svh">
    <USidebar class="h-svh shrink-0" />

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 h-(--ui-header-height) shrink-0 border-b border-default bg-default"
      ></header>

      <UMain class="min-h-0 flex-1">
        <slot />
      </UMain>
    </div>
  </div>
</template>
