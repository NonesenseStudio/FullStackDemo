import {
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";
import { menus, type Menu } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { hasPostgresErrorCode } from "../../utils/db-errors";
import { createMenuSchema } from "../../utils/menu-validation";

export default defineEventHandler(async (event) => {
  const result = createMenuSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "菜单信息格式不正确" });
  }

  let menu: Menu | undefined;
  try {
    [menu] = await getDb().insert(menus).values(result.data).returning();
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

  setResponseStatus(event, 201);
  return menu;
});
