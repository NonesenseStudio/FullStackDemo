import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getQuery } from "h3";
import { menus } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { menuIdSchema } from "../../utils/menu-validation";

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);
  const parsedId = menuIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw createError({ statusCode: 400, statusMessage: "菜单编号无效" });
  }

  const [deleted] = await getDb()
    .delete(menus)
    .where(eq(menus.id, parsedId.data))
    .returning({ id: menus.id });
  if (!deleted)
    throw createError({ statusCode: 404, statusMessage: "菜单不存在" });
  return { deleted: true, id: deleted.id };
});
