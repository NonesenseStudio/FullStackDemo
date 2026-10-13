import { and, asc, count, desc, ilike, sql } from "drizzle-orm";
import { createError, defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import {
  containsPattern,
  paginationBodySchema,
} from "../../utils/pagination-validation";

const sortColumns = {
  id: users.id,
  username: users.username,
  createdAt: users.createdAt,
};
const querySchema = paginationBodySchema.extend({
  username: z.string().trim().max(50).default(""),
  id: z.string().trim().max(20).default(""),
  sortBy: z.enum(["id", "username", "createdAt"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export default defineEventHandler(async (event) => {
  const result = querySchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "用户分页、筛选或排序参数无效",
    });
  }

  const { page, pageSize, username, id, sortBy, sortDirection } = result.data;
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw createError({ statusCode: 400, statusMessage: "页码超出有效范围" });
  }
  const where = and(
    username ? ilike(users.username, containsPattern(username)) : undefined,
    id ? ilike(sql`${users.id}::text`, containsPattern(id)) : undefined,
  );
  const db = getDb();
  const orderColumn = sortColumns[sortBy];
  const order = sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);
  const tieBreaker = sortDirection === "asc" ? asc(users.id) : desc(users.id);
  const [list, [totals]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(order, tieBreaker)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
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
