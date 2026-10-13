import { asc } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { menus, type Menu } from "../../db/scheme";
import { getDb } from "../../utils/db";

type MenuTreeNode = Menu & { children: MenuTreeNode[] };

export default defineEventHandler(async () => {
  const rows = await getDb()
    .select()
    .from(menus)
    .orderBy(asc(menus.sortOrder), asc(menus.id));
  const nodes: MenuTreeNode[] = rows.map((menu) => ({ ...menu, children: [] }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const roots: MenuTreeNode[] = [];

  for (const node of nodes) {
    const parent =
      node.parentId === null ? undefined : nodesById.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
});
