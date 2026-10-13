import { asc, eq } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { menus, userMenus, users } from "../../../db/scheme";
import { getDb } from "../../../utils/db";
import { menuIdSchema } from "../../../utils/menu-validation";

export default defineEventHandler(async (event) => {
  const parsedUserId = menuIdSchema.safeParse(getRouterParam(event, "id"));
  if (!parsedUserId.success) {
    throw createError({ statusCode: 400, statusMessage: "用户编号无效" });
  }

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsedUserId.data))
    .limit(1);
  if (!user)
    throw createError({ statusCode: 404, statusMessage: "用户不存在" });

  return db
    .select({
      id: menus.id,
      parentId: menus.parentId,
      title: menus.title,
      routeName: menus.routeName,
      routePath: menus.routePath,
      component: menus.component,
      pageMeta: menus.pageMeta,
      icon: menus.icon,
      sortOrder: menus.sortOrder,
      hidden: menus.hidden,
    })
    .from(userMenus)
    .innerJoin(menus, eq(userMenus.menuId, menus.id))
    .where(eq(userMenus.userId, user.id))
    .orderBy(asc(menus.sortOrder), asc(menus.id));
});
