import { and, asc, count, desc, eq, getTableColumns, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { menus } from "../../db/scheme";
import { getDb } from "../../utils/db";
import {
  containsPattern,
  paginationBodySchema,
} from "../../utils/pagination-validation";

const sortColumns = {
  id: menus.id,
  parentId: menus.parentId,
  title: menus.title,
  routeName: menus.routeName,
  routePath: menus.routePath,
  component: menus.component,
  icon: menus.icon,
  sortOrder: menus.sortOrder,
  hidden: menus.hidden,
  createdAt: menus.createdAt,
};
const querySchema = paginationBodySchema.extend({
  title: z.string().trim().max(100).default(""),
  routePath: z.string().trim().max(255).default(""),
  hidden: z.enum(["", "true", "false"]).default(""),
  sortBy: z
    .enum(
      Object.keys(sortColumns) as [
        keyof typeof sortColumns,
        ...(keyof typeof sortColumns)[],
      ],
    )
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
const parent = alias(menus, "parent");

export default defineEventHandler(async (event) => {
  const result = querySchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "菜单分页、筛选或排序参数无效",
    });
  }

  const { page, pageSize, title, routePath, hidden, sortBy, sortDirection } =
    result.data;
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw createError({ statusCode: 400, statusMessage: "页码超出有效范围" });
  }
  const where = and(
    title ? ilike(menus.title, containsPattern(title)) : undefined,
    routePath ? ilike(menus.routePath, containsPattern(routePath)) : undefined,
    hidden !== "" ? eq(menus.hidden, hidden === "true") : undefined,
  );
  const db = getDb();
  const orderColumn = sortColumns[sortBy];
  const order = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);
  const tieBreaker = sortDirection === "asc" ? asc(menus.id) : desc(menus.id);
  const [list, [totals]] = await Promise.all([
    db
      .select({ ...getTableColumns(menus), parentTitle: parent.title })
      .from(menus)
      .leftJoin(parent, eq(menus.parentId, parent.id))
      .where(where)
      .orderBy(order, tieBreaker)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(menus).where(where),
  ]);

  return {
    list,
    total: totals?.total ?? 0,
    page,
    pageSize,
    sortBy,
    sortDirection,
  };
});
