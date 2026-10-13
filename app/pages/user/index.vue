<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { z } from "zod";

definePageMeta({
  layout: "full",
});

type User = Record<string, unknown> & {
  id: number;
  username: string;
  createdAt: string;
};

const columns = [
  { key: "id", title: "用户编号" },
  { key: "username", title: "账号" },
  { key: "createdAt", title: "创建时间" },
];

const searchFields = [
  { key: "username", label: "账号" },
  { key: "id", label: "用户编号", type: "number" as const },
];

const users = ref<User[]>([]);
const total = ref(0);
const loading = ref(false);
const listError = ref("");
const page = ref(1);
const pageSize = ref(10);
const sortBy = ref("createdAt");
const sortDirection = ref<"asc" | "desc">("desc");
const activeFilters = ref<Record<string, string | number | null>>({});

const editingId = ref<number | null>(null);
const formOpen = ref(false);
const saving = ref(false);
const formError = ref("");
const userForm = reactive({ username: "", password: "" });
const isEditing = computed(() => editingId.value !== null);
const formTitle = computed(() => (isEditing.value ? "编辑用户" : "新增用户"));

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "请输入账号")
    .max(50, "账号最多 50 个字符"),
  password: z
    .string()
    .refine(
      (value) =>
        editingId.value !== null
          ? value.length === 0 || (value.length >= 8 && value.length <= 128)
          : value.length >= 8 && value.length <= 128,
      "密码需为 8 至 128 个字符；编辑时留空则不修改。",
    ),
});

const deleteOpen = ref(false);
const deleting = ref(false);
const deleteError = ref("");
const selectedUser = ref<{ id: number; username: string } | null>(null);
const toast = useToast();

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return fallback;
  }

  const data = error.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "statusMessage" in data &&
    typeof data.statusMessage === "string"
  ) {
    return data.statusMessage;
  }

  return fallback;
}

let listRequestId = 0;
async function loadUsers() {
  const requestId = ++listRequestId;
  loading.value = true;
  listError.value = "";

  try {
    const result = await $fetch<{ list: User[]; total: number }>("/api/user/page", {
      method: "POST",
      body: {
        ...activeFilters.value,
        page: page.value,
        pageSize: pageSize.value,
        sortBy: sortBy.value,
        sortDirection: sortDirection.value,
      },
    });
    if (requestId !== listRequestId) return;
    total.value = result.total;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value));
    if (page.value > lastPage) {
      page.value = lastPage;
      return;
    }
    users.value = result.list;
  } catch (error) {
    if (requestId !== listRequestId) return;
    listError.value = getErrorMessage(
      error,
      "暂时无法获取用户列表，请稍后再试。",
    );
  } finally {
    if (requestId === listRequestId) loading.value = false;
  }
}

function applySearch(filters: Record<string, string | number | null>) {
  activeFilters.value = filters;
  page.value = 1;
}

function openCreate() {
  editingId.value = null;
  userForm.username = "";
  userForm.password = "";
  formError.value = "";
  formOpen.value = true;
}

function openEdit(row: Record<string, unknown>) {
  if (typeof row.id !== "number" || typeof row.username !== "string") return;

  editingId.value = row.id;
  userForm.username = row.username;
  userForm.password = "";
  formError.value = "";
  formOpen.value = true;
}

async function saveUser() {
  if (saving.value) return;

  saving.value = true;
  formError.value = "";

  try {
    const username = userForm.username.trim();

    if (editingId.value === null) {
      await $fetch("/api/user", {
        method: "POST",
        body: { username, password: userForm.password },
      });
      page.value = 1;
      toast.add({ title: "用户已创建", color: "success" });
    } else {
      const body: { id: number; username: string; password?: string } = {
        id: editingId.value,
        username,
      };
      if (userForm.password) body.password = userForm.password;

      await $fetch("/api/user", { method: "PUT", body });
      toast.add({ title: "用户信息已更新", color: "success" });
    }

    formOpen.value = false;
    await loadUsers();
  } catch (error) {
    formError.value = getErrorMessage(
      error,
      "暂时无法保存用户信息，请稍后再试。",
    );
  } finally {
    saving.value = false;
  }
}

function requestDelete(row: Record<string, unknown>) {
  if (typeof row.id !== "number" || typeof row.username !== "string") return;

  selectedUser.value = { id: row.id, username: row.username };
  deleteError.value = "";
  deleteOpen.value = true;
}

async function deleteUser() {
  if (!selectedUser.value || deleting.value) return;

  deleting.value = true;
  deleteError.value = "";

  try {
    await $fetch("/api/user", {
      method: "DELETE",
      query: { id: selectedUser.value.id },
    });
    deleteOpen.value = false;
    selectedUser.value = null;
    toast.add({ title: "用户已删除", color: "success" });
    await loadUsers();
  } catch (error) {
    deleteError.value = getErrorMessage(
      error,
      "暂时无法删除用户，请稍后再试。",
    );
  } finally {
    deleting.value = false;
  }
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

onMounted(() => {
  void loadUsers();
});
watch([page, pageSize, activeFilters, sortBy, sortDirection], () => { void loadUsers(); });
</script>

<template>
  <main class="flex h-full min-h-0 flex-col p-6">
    <p
      v-if="listError"
      role="alert"
      class="rounded-md bg-error/10 px-4 py-3 text-sm text-error"
    >
      {{ listError }}
    </p>

    <FTable
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:sort-by="sortBy"
      v-model:sort-direction="sortDirection"
      :columns="columns"
      :data="users"
      :total="total"
      :loading="loading"
      :search-fields="searchFields"
      @search="applySearch"
      @create="openCreate"
      @edit="openEdit"
      @delete="requestDelete"
    >
      <template #cell-createdAt="{ value }">
        {{ formatDate(value) }}
      </template>
    </FTable>

    <UModal v-model:open="formOpen" :title="formTitle">
      <template #body>
        <UForm
          :schema="userSchema"
          :state="userForm"
          class="space-y-4"
          @submit="saveUser"
        >
          <UFormField label="账号" name="username" required>
            <UInput
              v-model="userForm.username"
              autocomplete="username"
              class="w-full"
              maxlength="50"
              placeholder="请输入账号"
            />
          </UFormField>

          <UFormField
            label="密码"
            name="password"
            :description="isEditing ? '留空则不修改密码。' : '至少 8 个字符。'"
            :required="!isEditing"
          >
            <UInput
              v-model="userForm.password"
              autocomplete="new-password"
              class="w-full"
              maxlength="128"
              :placeholder="isEditing ? '请输入新密码' : '请输入密码'"
              type="password"
            />
          </UFormField>

          <p
            v-if="formError"
            role="alert"
            class="rounded-md bg-error/10 px-3 py-2 text-sm text-error"
          >
            {{ formError }}
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="formOpen = false"
            >
              取消
            </UButton>
            <UButton type="submit" :loading="saving">
              {{ isEditing ? "保存修改" : "创建用户" }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="删除用户">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-default">
            确认删除账号“{{ selectedUser?.username }}”？删除后无法恢复。
          </p>

          <p
            v-if="deleteError"
            role="alert"
            class="rounded-md bg-error/10 px-3 py-2 text-sm text-error"
          >
            {{ deleteError }}
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="deleting"
              @click="deleteOpen = false"
            >
              取消
            </UButton>
            <UButton
              type="button"
              color="error"
              :loading="deleting"
              @click="deleteUser"
            >
              确认删除
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </main>
</template>
