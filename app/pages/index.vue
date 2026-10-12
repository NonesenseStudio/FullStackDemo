<script setup lang="ts">
import { ref } from "vue";

const message = ref("Welcome");
</script>

<template>
  <main>
    <h1 class="text-3xl font-bold">{{ message }}</h1>
  </main>
</template>
