import { asc, eq } from "drizzle-orm";
import { createError, defineEventHandler, getQuery } from "h3";
import { menus } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { menuIdSchema } from "../../utils/menu-validation";

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);
  const db = getDb();

  if (id === undefined) {
    return db.select().from(menus).orderBy(asc(menus.sortOrder), asc(menus.id));
  }

  const parsedId = menuIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw createError({ statusCode: 400, statusMessage: "菜单编号无效" });
  }

  const [menu] = await db
    .select()
    .from(menus)
    .where(eq(menus.id, parsedId.data))
    .limit(1);
  if (!menu)
    throw createError({ statusCode: 404, statusMessage: "菜单不存在" });
  return menu;
});
