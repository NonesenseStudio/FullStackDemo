import { eq } from "drizzle-orm";
import { createError, defineEventHandler, readBody } from "h3";
import { menus, type Menu } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { hasPostgresErrorCode } from "../../utils/db-errors";
import { updateMenuSchema } from "../../utils/menu-validation";

export default defineEventHandler(async (event) => {
  const result = updateMenuSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "菜单信息格式不正确" });
  }

  const { id, ...changes } = result.data;
  if (Object.keys(changes).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "请提供要修改的菜单信息",
    });
  }
  const db = getDb();
  if (changes.parentId != null) {
    let ancestorId: number | null = changes.parentId;
    while (ancestorId !== null) {
      if (ancestorId === id) {
        throw createError({
          statusCode: 400,
          statusMessage: "菜单层级不能形成循环",
        });
      }

      const [ancestor] = await db
        .select({ parentId: menus.parentId })
        .from(menus)
        .where(eq(menus.id, ancestorId))
        .limit(1);
      if (!ancestor) {
        throw createError({ statusCode: 400, statusMessage: "上级菜单不存在" });
      }
      ancestorId = ancestor.parentId;
    }
  }

  let menu: Menu | undefined;
  try {
    [menu] = await db
      .update(menus)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(menus.id, id))
      .returning();
  } catch (error) {
    if (hasPostgresErrorCode(error, "23505")) {
      throw createError({
        statusCode: 409,
        statusMessage: "路由名称或路径已存在",
      });
    }
    if (hasPostgresErrorCode(error, "23503")) {
      throw createError({ statusCode: 400, statusMessage: "上级菜单不存在" });
    }
    throw error;
  }

  if (!menu)
    throw createError({ statusCode: 404, statusMessage: "菜单不存在" });
  return menu;
});
