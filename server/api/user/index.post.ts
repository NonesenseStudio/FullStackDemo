import {
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { hasPostgresErrorCode } from "../../utils/db-errors";
import { hashPassword } from "../../utils/auth";
import { createUserSchema } from "../../utils/user-validation";

export default defineEventHandler(async (event) => {
  const result = createUserSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "用户信息格式不正确" });
  }

  try {
    const [user] = await getDb()
      .insert(users)
      .values({
        username: result.data.username,
        passwordHash: await hashPassword(result.data.password),
      })
      .returning({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
      });

    setResponseStatus(event, 201);
    return user;
  } catch (error) {
    if (hasPostgresErrorCode(error, "23505")) {
      throw createError({ statusCode: 409, statusMessage: "该账号已被使用" });
    }
    throw error;
  }
});
