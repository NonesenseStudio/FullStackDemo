import { and, eq, inArray, notInArray } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { z } from "zod";
import { menus, userMenus, users } from "../../../db/scheme";
import { getDb } from "../../../utils/db";
import { menuIdSchema } from "../../../utils/menu-validation";

const bindingSchema = z.object({
  menuIds: z.array(menuIdSchema).max(1000),
});

export default defineEventHandler(async (event) => {
  const parsedUserId = menuIdSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedUserId.success) {
    throw createError({ statusCode: 400, statusMessage: "用户编号无效" });
  }

  const result = bindingSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "菜单绑定信息格式不正确",
    });
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsedUserId.data))
    .limit(1);
  if (!user)
    throw createError({ statusCode: 404, statusMessage: "用户不存在" });

  const menuIds = [...new Set(result.data.menuIds)];
  if (menuIds.length > 0) {
    const existingMenus = await db
      .select({ id: menus.id })
      .from(menus)
      .where(inArray(menus.id, menuIds));
    if (existingMenus.length !== menuIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: "绑定的菜单中存在无效编号",
      });
    }
  }

  const userCondition = eq(userMenus.userId, user.id);
  if (menuIds.length > 0) {
    await db
      .insert(userMenus)
      .values(menuIds.map((menuId) => ({ userId: user.id, menuId })))
      .onConflictDoNothing();
    await db
      .delete(userMenus)
      .where(and(userCondition, notInArray(userMenus.menuId, menuIds)));
  } else {
    await db.delete(userMenus).where(userCondition);
  }

  return { userId: user.id, menuIds };
});
