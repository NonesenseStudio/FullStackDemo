<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import type { FormSubmitEvent } from "@nuxt/ui";
import { z } from "zod";

definePageMeta({ layout: "full" });

type Menu = Record<string, unknown> & {
  id: number;
  parentId: number | null;
  parentTitle?: string | null;
  title: string;
  routeName: string;
  routePath: string;
  component: string;
  pageMeta: Record<string, unknown>;
  icon: string | null;
  sortOrder: number;
  hidden: boolean;
};
type SearchFilters = Record<string, string | number | null>;

const columns = [
  { key: "id", title: "菜单编号" },
  { key: "title", title: "菜单名称" },
  { key: "parentId", title: "上级菜单" },
  { key: "routeName", title: "路由名称" },
  { key: "routePath", title: "路由路径" },
  { key: "component", title: "页面组件" },
  { key: "icon", title: "图标" },
  { key: "sortOrder", title: "排序" },
  { key: "hidden", title: "显示状态" },
  { key: "createdAt", title: "创建时间" },
];
const searchFields = [
  { key: "title", label: "菜单名称" },
  { key: "routePath", label: "路由路径" },
  {
    key: "hidden",
    label: "显示状态",
    type: "select" as const,
    options: [
      { label: "显示", value: "false" },
      { label: "隐藏", value: "true" },
    ],
  },
];

const menus = ref<Menu[]>([]);
const allMenus = ref<Menu[]>([]);
const total = ref(0);
const loadingHierarchy = ref(false);
const loading = ref(false);
const listError = ref("");
const page = ref(1);
const pageSize = ref(10);
const sortBy = ref("createdAt");
const sortDirection = ref<"asc" | "desc">("desc");
const activeFilters = ref<SearchFilters>({});
const menuById = computed(() => new Map(menus.value.map((menu) => [menu.id, menu])));

// Include every descendant: the database cascades deletes through the whole subtree.
function subtreeIds(id: number): Set<number> {
  const ids = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parentId = pending.pop();
    for (const menu of allMenus.value) {
      if (menu.parentId === parentId && !ids.has(menu.id)) {
        ids.add(menu.id);
        pending.push(menu.id);
      }
    }
  }
  return ids;
}

const editingId = ref<number | null>(null);
const formOpen = ref(false);
const saving = ref(false);
const formError = ref("");
const menuForm = reactive({
  parentId: 0,
  title: "",
  routeName: "",
  routePath: "",
  component: "",
  icon: "",
  sortOrder: 0 as number | null,
  hidden: false,
  pageMeta: "{}",
});
const isEditing = computed(() => editingId.value !== null);
const formTitle = computed(() => isEditing.value ? "编辑菜单" : "新增菜单");
const parentOptions = computed(() => {
  const excluded = editingId.value === null ? new Set<number>() : subtreeIds(editingId.value);
  return [
    { label: "无上级菜单", value: 0 },
    ...allMenus.value
      .filter((menu) => !excluded.has(menu.id))
      .map((menu) => ({ label: `${menu.title}（${menu.routePath}）`, value: menu.id })),
  ];
});

const menuSchema = z.object({
  parentId: z.number().int().nonnegative("请选择上级菜单").refine(
    (id) => parentOptions.value.some((option) => option.value === id),
    "请选择有效的上级菜单",
  ),
  title: z.string().trim().min(1, "请输入菜单名称").max(100, "菜单名称最多 100 个字符"),
  routeName: z.string().trim().min(1, "请输入路由名称").max(100, "路由名称最多 100 个字符"),
  routePath: z.string().trim().min(1, "请输入路由路径").max(255, "路由路径最多 255 个字符")
    .refine((path) => path.startsWith("/"), "路由路径必须以 / 开头"),
  component: z.string().trim().min(1, "请输入页面组件").max(255, "页面组件最多 255 个字符"),
  icon: z.string().trim().max(100, "图标名称最多 100 个字符"),
  sortOrder: z.number({ error: "请输入整数排序值" }).int("排序值必须为整数")
    .nullable().transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: "custom", message: "请输入整数排序值" });
        return z.NEVER;
      }
      return value;
    }),
  hidden: z.boolean(),
  pageMeta: z.string().transform((value, ctx): Record<string, unknown> => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Report syntax and non-object values as a field validation error.
    }
    ctx.addIssue({ code: "custom", message: "页面配置必须是有效的 JSON 对象" });
    return z.NEVER;
  }),
});

const deleteOpen = ref(false);
const deleting = ref(false);
const deleteError = ref("");
const selectedMenu = ref<Menu | null>(null);
const descendantCount = computed(() => selectedMenu.value ? subtreeIds(selectedMenu.value.id).size - 1 : 0);
const toast = useToast();

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "statusMessage" in data && typeof data.statusMessage === "string") {
      return data.statusMessage;
    }
  }
  return fallback;
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

let listRequestId = 0;
async function loadMenus() {
  const requestId = ++listRequestId;
  loading.value = true;
  listError.value = "";
  try {
    const result = await $fetch<{ list: Menu[]; total: number }>("/api/menu/page", {
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
    menus.value = result.list;
  } catch (error) {
    if (requestId !== listRequestId) return;
    listError.value = getErrorMessage(error, "暂时无法获取菜单列表，请稍后再试。");
  } finally {
    if (requestId === listRequestId) loading.value = false;
  }
}

async function loadHierarchy(): Promise<boolean> {
  if (loadingHierarchy.value) return false;
  loadingHierarchy.value = true;
  try {
    allMenus.value = await $fetch<Menu[]>("/api/menu");
    return true;
  } catch (error) {
    toast.add({ title: getErrorMessage(error, "暂时无法获取菜单层级，请稍后再试。"), color: "error" });
    return false;
  } finally {
    loadingHierarchy.value = false;
  }
}

function applySearch(filters: SearchFilters) {
  activeFilters.value = filters;
  page.value = 1;
}

async function openCreate() {
  if (!await loadHierarchy()) return;
  editingId.value = null;
  Object.assign(menuForm, {
    parentId: 0, title: "", routeName: "", routePath: "", component: "",
    icon: "", sortOrder: 0, hidden: false, pageMeta: "{}",
  });
  formError.value = "";
  formOpen.value = true;
}

async function openEdit(row: Record<string, unknown>) {
  const menu = typeof row.id === "number" ? menuById.value.get(row.id) : undefined;
  if (!menu) return;
  if (!await loadHierarchy()) return;
  editingId.value = menu.id;
  Object.assign(menuForm, {
    parentId: menu.parentId ?? 0,
    title: menu.title,
    routeName: menu.routeName,
    routePath: menu.routePath,
    component: menu.component,
    icon: menu.icon ?? "",
    sortOrder: menu.sortOrder,
    hidden: menu.hidden,
    pageMeta: JSON.stringify(menu.pageMeta, null, 2),
  });
  formError.value = "";
  formOpen.value = true;
}

async function saveMenu(event: FormSubmitEvent<z.output<typeof menuSchema>>) {
  if (saving.value) return;
  saving.value = true;
  formError.value = "";
  try {
    const body = {
      ...event.data,
      parentId: event.data.parentId === 0 ? null : event.data.parentId,
      icon: event.data.icon || null,
    };
    if (editingId.value === null) {
      await $fetch("/api/menu", { method: "POST", body });
      page.value = 1;
      toast.add({ title: "菜单已创建", color: "success" });
    } else {
      await $fetch("/api/menu", { method: "PUT", body: { ...body, id: editingId.value } });
      toast.add({ title: "菜单已更新", color: "success" });
    }
    formOpen.value = false;
    await loadMenus();
  } catch (error) {
    formError.value = getErrorMessage(error, "暂时无法保存菜单，请稍后再试。");
  } finally {
    saving.value = false;
  }
}

async function requestDelete(row: Record<string, unknown>) {
  const menu = typeof row.id === "number" ? menuById.value.get(row.id) : undefined;
  if (!menu) return;
  if (!await loadHierarchy()) return;
  selectedMenu.value = menu;
  deleteError.value = "";
  deleteOpen.value = true;
}

async function deleteMenu() {
  if (!selectedMenu.value || deleting.value) return;
  deleting.value = true;
  deleteError.value = "";
  try {
    await $fetch("/api/menu", { method: "DELETE", query: { id: selectedMenu.value.id } });
    deleteOpen.value = false;
    selectedMenu.value = null;
    toast.add({ title: "菜单已删除", color: "success" });
    await loadMenus();
  } catch (error) {
    deleteError.value = getErrorMessage(error, "暂时无法删除菜单，请稍后再试。");
  } finally {
    deleting.value = false;
  }
}

onMounted(() => { void loadMenus(); });
watch([page, pageSize, activeFilters, sortBy, sortDirection], () => { void loadMenus(); });
</script>

<template>
  <section aria-label="菜单管理" class="flex h-full min-h-0 flex-col gap-4 p-6">
    <p v-if="listError" role="alert" class="rounded-md bg-error/10 px-4 py-3 text-sm text-error">
      {{ listError }}
    </p>

    <FTable
      v-model:page="page"
      v-model:page-size="pageSize"
      v-model:sort-by="sortBy"
      v-model:sort-direction="sortDirection"
      :columns="columns"
      :data="menus"
      :total="total"
      :loading="loading"
      :search-fields="searchFields"
      :show-create="!loading && !loadingHierarchy && !saving && !deleting"
      :show-actions="!loading && !loadingHierarchy && !saving && !deleting"
      create-text="新增菜单"
      :empty-text="listError ? '菜单列表加载失败' : '暂无符合条件的菜单'"
      @search="applySearch"
      @create="openCreate"
      @edit="openEdit"
      @delete="requestDelete"
    >
      <template #toolbar>
        <UButton type="button" color="neutral" variant="outline" :loading="loading" :disabled="saving || deleting" @click="loadMenus">
          刷新列表
        </UButton>
      </template>
      <template #cell-parentId="{ value, row }">{{ value === null ? "无上级菜单" : row.parentTitle ?? `菜单 ${value}` }}</template>
      <template #cell-icon="{ value }">{{ value || "—" }}</template>
      <template #cell-createdAt="{ value }">{{ formatDate(value) }}</template>
      <template #cell-hidden="{ value }">
        <UBadge :color="value ? 'neutral' : 'success'" variant="subtle">{{ value ? "隐藏" : "显示" }}</UBadge>
      </template>
    </FTable>

    <UModal v-model:open="formOpen" :title="formTitle" :dismissible="!saving" :close="saving ? false : { 'aria-label': '关闭' }" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <UForm :schema="menuSchema" :state="menuForm" :disabled="saving" class="space-y-4" @submit="saveMenu">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="菜单名称" name="title" required>
              <UInput v-model="menuForm.title" class="w-full" maxlength="100" placeholder="请输入菜单名称" />
            </UFormField>
            <UFormField label="上级菜单" name="parentId">
              <USelect v-model="menuForm.parentId" :items="parentOptions" class="w-full" />
            </UFormField>
            <UFormField label="路由名称" name="routeName" required>
              <UInput v-model="menuForm.routeName" class="w-full" maxlength="100" placeholder="请输入路由名称" />
            </UFormField>
            <UFormField label="路由路径" name="routePath" required>
              <UInput v-model="menuForm.routePath" class="w-full" maxlength="255" placeholder="请输入以 / 开头的路径" />
            </UFormField>
            <UFormField label="页面组件" name="component" required>
              <UInput v-model="menuForm.component" class="w-full" maxlength="255" placeholder="请输入页面组件路径" />
            </UFormField>
            <UFormField label="图标" name="icon">
              <UInput v-model="menuForm.icon" class="w-full" maxlength="100" placeholder="请输入图标名称（可选）" />
            </UFormField>
            <UFormField label="排序" name="sortOrder" description="数值越小，排列越靠前。" required>
              <UInputNumber v-model="menuForm.sortOrder" :step="1" class="w-full" />
            </UFormField>
            <UFormField label="显示状态" name="hidden">
              <UCheckbox v-model="menuForm.hidden" label="隐藏菜单" />
            </UFormField>
          </div>
          <UFormField label="页面配置" name="pageMeta" description="填写 JSON 对象；无配置时使用 {}。">
            <UTextarea v-model="menuForm.pageMeta" :rows="5" class="w-full" :ui="{ base: 'font-mono' }" />
          </UFormField>
          <p v-if="formError" role="alert" class="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{{ formError }}</p>
          <div class="flex justify-end gap-2 pt-2">
            <UButton type="button" color="neutral" variant="outline" :disabled="saving" @click="formOpen = false">取消</UButton>
            <UButton type="submit" :loading="saving">{{ isEditing ? "保存修改" : "创建菜单" }}</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" title="删除菜单" :dismissible="!deleting" :close="deleting ? false : { 'aria-label': '关闭' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-default">确认删除菜单“{{ selectedMenu?.title }}”？删除后无法恢复。</p>
          <p v-if="descendantCount" class="text-sm text-error">同时删除其下的 {{ descendantCount }} 个子菜单。</p>
          <p class="text-sm text-muted">所删菜单的用户授权也会一并移除。</p>
          <p v-if="deleteError" role="alert" class="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{{ deleteError }}</p>
          <div class="flex justify-end gap-2">
            <UButton type="button" color="neutral" variant="outline" :disabled="deleting" @click="deleteOpen = false">取消</UButton>
            <UButton type="button" color="error" :loading="deleting" @click="deleteMenu">确认删除</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
