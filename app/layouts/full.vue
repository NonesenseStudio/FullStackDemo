<template>
  <div class="flex min-h-svh">
    <USidebar
      v-model:open="sidebarOpen"
      title="FullStackDemo"
      class="h-svh shrink-0"
    >
      <div class="h-full overflow-y-auto p-3">
        <p
          v-if="menuLoadError"
          role="alert"
          class="px-2 py-3 text-sm text-error"
        >
          {{ menuLoadError }}
        </p>
        <UNavigationMenu
          v-else-if="sidebarItems.length"
          :items="sidebarItems"
          orientation="vertical"
          highlight
          class="w-full"
        />
      </div>
    </USidebar>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 h-(--ui-header-height) shrink-0 border-b border-default bg-default"
      >
        <div class="flex h-full items-center px-3">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-ic-baseline-menu"
            :aria-label="sidebarOpen ? '收起菜单' : '展开菜单'"
            @click="sidebarOpen = !sidebarOpen"
          />
        </div>
      </header>

      <UMain class="min-h-0 flex-1">
        <slot />
      </UMain>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

interface MenuTreeNode {
  id: number;
  title: string;
  routePath: string;
  icon: string | null;
  hidden: boolean;
  children: MenuTreeNode[];
}

interface SidebarItem {
  label: string;
  to: string;
  icon?: string;
  children?: SidebarItem[];
}

const menuTree = useState<MenuTreeNode[]>("menu-tree", () => []);
const sidebarOpen = ref(true);
const menuLoadError = ref("");

function toSidebarItems(nodes: MenuTreeNode[]): SidebarItem[] {
  return nodes
    .filter((node) => !node.hidden)
    .map((node) => {
      const children = toSidebarItems(node.children);
      return {
        label: node.title,
        to: node.routePath,
        ...(node.icon ? { icon: node.icon } : {}),
        ...(children.length ? { children } : {}),
      };
    });
}

const sidebarItems = computed(() => toSidebarItems(menuTree.value));

watch(menuTree, () => {
  menuLoadError.value = "";
});

onMounted(async () => {
  if (menuTree.value.length) return;
  try {
    menuTree.value = await $fetch<MenuTreeNode[]>("/api/menu/tree");
  } catch {
    menuLoadError.value = "无法加载菜单";
  }
});
</script>
