<script setup lang="ts">
import { computed, h, reactive, resolveComponent, watch } from "vue";
import type { TableColumn } from "@nuxt/ui";
import type { SortingState } from "@tanstack/vue-table";

type SearchValue = string | number | null;
type TableRow = Record<string, unknown>;

interface FTableColumn {
  key: string;
  title: string;
}

interface SearchOption {
  label: string;
  value: string | number;
}

interface SearchField {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: SearchOption[];
  defaultValue?: SearchValue;
}

const props = withDefaults(
  defineProps<{
    columns: FTableColumn[];
    data?: TableRow[];
    total?: number;
    loading?: boolean;
    searchFields?: SearchField[];
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    pageSizeOptions?: number[];
    showCreate?: boolean;
    showActions?: boolean;
    createText?: string;
    emptyText?: string;
  }>(),
  {
    data: () => [],
    total: 0,
    loading: false,
    searchFields: () => [],
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
    pageSizeOptions: () => [10, 20, 50],
    showCreate: true,
    showActions: true,
    createText: "新增",
    emptyText: "暂无数据",
  },
);

const emit = defineEmits<{
  (event: "search", filters: Record<string, SearchValue>): void;
  (event: "update:page", page: number): void;
  (event: "update:pageSize", pageSize: number): void;
  (event: "update:sortBy", sortBy: string): void;
  (event: "update:sortDirection", direction: "asc" | "desc"): void;
  (event: "create"): void;
  (event: "edit", row: TableRow): void;
  (event: "delete", row: TableRow): void;
}>();

const filters = reactive<Record<string, SearchValue>>({});

watch(
  () => props.searchFields,
  (fields) => {
    for (const key of Object.keys(filters)) {
      if (!fields.some((field) => field.key === key)) {
        delete filters[key];
      }
    }

    for (const field of fields) {
      if (!(field.key in filters)) {
        filters[field.key] =
          field.defaultValue !== undefined ? field.defaultValue : "";
      }
    }
  },
  { immediate: true },
);

const tableColumns = computed<TableColumn<TableRow>[]>(() => [
  ...props.columns.map((column) => ({
    accessorKey: column.key,
    enableSorting: true,
    header: ({ column: tableColumn }) => {
      const sorted = tableColumn.getIsSorted();
      const UButton = resolveComponent("UButton");
      const nextDirection = sorted === "asc" ? "降序" : "升序";
      const indicator = sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕";
      const indicatorClass = sorted
        ? "text-muted"
        : "text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";
      return h(UButton, {
        type: "button",
        color: "neutral",
        variant: "ghost",
        size: "sm",
        class: "group -mx-2.5",
        "aria-label": `按${column.title}${nextDirection}排列`,
        onClick: () => tableColumn.toggleSorting(sorted === "asc"),
      }, () => [column.title, h("span", { "aria-hidden": "true", class: indicatorClass }, indicator)]);
    },
  })),
  ...(props.showActions
    ? [
        {
          id: "actions",
          header: "操作",
          enableSorting: false,
        },
      ]
    : []),
]);

const sorting = computed<SortingState>({
  get: () => [{ id: props.sortBy, desc: props.sortDirection === "desc" }],
  set: ([sort]) => {
    if (!sort) return;
    emit("update:sortBy", sort.id);
    emit("update:sortDirection", sort.desc ? "desc" : "asc");
    emit("update:page", 1);
  },
});

const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
);

function cellSlotName(key: string) {
  return `${key}-cell`;
}

function submitSearch() {
  emit("update:page", 1);
  emit("search", { ...filters });
}

function resetSearch() {
  for (const field of props.searchFields) {
    filters[field.key] =
      field.defaultValue !== undefined ? field.defaultValue : "";
  }

  submitSearch();
}

function changePage(page: number) {
  emit("update:page", Math.min(Math.max(page, 1), pageCount.value));
}

function changePageSize(event: Event) {
  const pageSize = Number((event.target as HTMLSelectElement).value);
  emit("update:page", 1);
  emit("update:pageSize", pageSize);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col gap-4">
    <form
      v-if="searchFields.length"
      class="flex shrink-0 flex-wrap items-end gap-3"
      @submit.prevent="submitSearch"
    >
      <label
        v-for="field in searchFields"
        :key="field.key"
        class="grid min-w-44 gap-1.5"
      >
        <span class="text-sm font-medium text-highlighted">{{
          field.label
        }}</span>

        <select
          v-if="field.type === 'select'"
          v-model="filters[field.key]"
          class="h-9 rounded-md border border-default bg-default px-3 text-sm text-default outline-none focus:border-primary"
        >
          <option value="">全部</option>
          <option
            v-for="option in field.options ?? []"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>

        <UInput
          v-else
          v-model="filters[field.key]"
          :type="field.type ?? 'text'"
          :placeholder="field.placeholder ?? `请输入${field.label}`"
        />
      </label>

      <div class="flex items-center gap-2">
        <UButton type="submit">搜索</UButton>
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          @click="resetSearch"
        >
          重置
        </UButton>
      </div>
    </form>

    <div
      v-if="showCreate || $slots.toolbar"
      class="flex shrink-0 flex-wrap items-center gap-2"
    >
      <UButton v-if="showCreate" type="button" @click="emit('create')">
        {{ createText }}
      </UButton>
      <slot name="toolbar" />
    </div>

    <UTable
      v-model:sorting="sorting"
      :data="data"
      :columns="tableColumns"
      :loading="loading"
      :empty="emptyText"
      manual-sorting
      class="min-h-0 flex-1 overflow-auto rounded-md border border-default"
      :ui="{
        th: 'border-b border-r border-default last:border-r-0',
        td: 'border-b border-r border-default last:border-r-0',
      }"
    >
      <template
        v-for="column in columns"
        :key="column.key"
        #[cellSlotName(column.key)]="{ row, getValue }"
      >
        <slot
          :name="`cell-${column.key}`"
          :column="column"
          :row="row.original"
          :value="getValue()"
        >
          <slot
            name="cell"
            :column="column"
            :row="row.original"
            :value="getValue()"
          >
            {{ getValue() ?? "—" }}
          </slot>
        </slot>
      </template>

      <template v-if="showActions" #actions-cell="{ row }">
        <slot name="actions" :row="row.original">
          <div class="flex items-center justify-end gap-1">
            <UButton
              type="button"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="emit('edit', row.original)"
            >
              编辑
            </UButton>
            <UButton
              type="button"
              size="sm"
              color="error"
              variant="ghost"
              @click="emit('delete', row.original)"
            >
              删除
            </UButton>
          </div>
        </slot>
      </template>
    </UTable>

    <div
      v-if="total > 0"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <span class="text-sm text-muted">共 {{ total }} 条</span>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-muted">
          每页
          <select
            :value="pageSize"
            class="h-8 rounded-md border border-default bg-default px-2 text-sm text-default outline-none focus:border-primary"
            @change="changePageSize"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
          条
        </label>

        <UPagination
          :page="page"
          :items-per-page="pageSize"
          :total="total"
          @update:page="changePage"
        />
      </div>
    </div>
  </div>
</template>
