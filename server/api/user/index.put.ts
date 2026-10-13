import { eq } from "drizzle-orm";
import { createError, defineEventHandler, readBody } from "h3";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { hasPostgresErrorCode } from "../../utils/db-errors";
import { hashPassword } from "../../utils/auth";
import { updateUserSchema } from "../../utils/user-validation";

export default defineEventHandler(async (event) => {
  const result = updateUserSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "用户信息格式不正确" });
  }

  const { id, ...changes } = result.data;
  if (changes.username === undefined && changes.password === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: "请提供要修改的用户信息",
    });
  }

  const updates: { username?: string; passwordHash?: string } = {};
  if (changes.username !== undefined) updates.username = changes.username;
  if (changes.password !== undefined) {
    updates.passwordHash = await hashPassword(changes.password);
  }

  try {
    const [user] = await getDb()
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
      });
    if (!user)
      throw createError({ statusCode: 404, statusMessage: "用户不存在" });
    return user;
  } catch (error) {
    if (hasPostgresErrorCode(error, "23505")) {
      throw createError({ statusCode: 409, statusMessage: "该账号已被使用" });
    }
    throw error;
  }
});
