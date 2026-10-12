<script setup lang="ts">
import { reactive, ref } from "vue";
import { z } from "zod";

const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "请输入账号")
      .max(50, "账号最多 50 个字符"),
    password: z
      .string()
      .min(8, "密码至少需要 8 个字符")
      .max(128, "密码不能超过 128 个字符"),
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((form) => form.password === form.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });

const form = reactive({ username: "", password: "", confirmPassword: "" });
const errorMessage = ref("");
const route = useRoute();

function getErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "暂时无法创建账号，请稍后再试。";
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;
  const data =
    "data" in error && typeof error.data === "object" && error.data !== null
      ? error.data
      : undefined;
  const statusMessage =
    data && "statusMessage" in data && typeof data.statusMessage === "string"
      ? data.statusMessage
      : undefined;

  if ((statusCode === 400 || statusCode === 409) && statusMessage) {
    return statusMessage;
  }

  return "暂时无法创建账号，请稍后再试。";
}

async function handleSubmit() {
  errorMessage.value = "";

  try {
    await $fetch("/api/auth/register", {
      method: "POST",
      body: {
        username: form.username,
        password: form.password,
      },
    });

    const redirect = route.query.redirect;
    const destination =
      typeof redirect === "string" &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//")
        ? redirect
        : "/";

    await navigateTo(destination);
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}
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
          aria-hidden="true"
          class="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-900/15"
        >
          F
        </div>
        <span class="text-base font-semibold tracking-tight text-slate-900">
          FullStackDemo
        </span>
      </div>

      <div class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-950">
          创建账号
        </h1>
      </div>

      <UForm
        :schema="signupSchema"
        :state="form"
        class="space-y-5"
        v-slot="{ loading }"
        @submit="handleSubmit"
      >
        <UFormField label="账号" name="username" required>
          <UInput
            v-model="form.username"
            autocomplete="username"
            class="w-full"
            maxlength="50"
            placeholder="请输入账号"
            size="xl"
            required
          />
        </UFormField>

        <UFormField
          description="密码需为 8 至 128 个字符。"
          label="密码"
          name="password"
          required
        >
          <UInput
            v-model="form.password"
            autocomplete="new-password"
            class="w-full"
            maxlength="128"
            minlength="8"
            placeholder="请输入密码"
            size="xl"
            type="password"
            required
          />
        </UFormField>

        <UFormField label="确认密码" name="confirmPassword" required>
          <UInput
            v-model="form.confirmPassword"
            autocomplete="new-password"
            class="w-full"
            maxlength="128"
            placeholder="请再次输入密码"
            size="xl"
            type="password"
            required
          />
        </UFormField>

        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>

        <UButton
          class="mt-2 w-full justify-center font-semibold cursor-pointer"
          color="primary"
          :loading="loading"
          size="xl"
          type="submit"
        >
          {{ loading ? "正在创建…" : "创建账号" }}
        </UButton>
      </UForm>

      <p class="mt-6 text-center text-sm text-slate-500">
        已有账号？
        <NuxtLink
          class="font-medium text-blue-700 hover:text-blue-800"
          to="/login"
        >
          去登录
        </NuxtLink>
      </p>
    </section>
  </main>
</template>
