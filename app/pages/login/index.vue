<script setup lang="ts">
import { reactive } from "vue";

const form = reactive({
  account: "",
  password: "",
});
</script>

<template>
  <main
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6fa] px-4 py-12"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-indigo-200/40 blur-3xl"
    />

    <section
      class="relative w-full max-w-110 rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_80px_-32px_rgba(31,53,83,0.28)] backdrop-blur-xl sm:p-10"
    >
      <div class="mb-9 flex items-center gap-3">
        <div
          class="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-900/15"
        >
          F
        </div>
        <span class="text-base font-semibold tracking-tight text-slate-900"
          >FullStackDemo</span
        >
      </div>

      <div class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-950">
          欢迎登录
        </h1>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          登录后继续使用 FullStackDemo。
        </p>
      </div>

      <UForm :state="form" class="space-y-5">
        <UFormField label="账号" name="account" required>
          <UInput
            v-model="form.account"
            autocomplete="username"
            class="w-full"
            placeholder="请输入账号"
            size="xl"
            required
          />
        </UFormField>

        <UFormField label="密码" name="password" required>
          <UInput
            v-model="form.password"
            autocomplete="current-password"
            class="w-full"
            placeholder="请输入密码"
            size="xl"
            type="password"
            required
          />
        </UFormField>

        <UButton
          class="mt-2 w-full justify-center font-semibold cursor-pointer"
          color="primary"
          size="xl"
          type="submit"
        >
          登录
        </UButton>
      </UForm>
    </section>
  </main>
</template>
