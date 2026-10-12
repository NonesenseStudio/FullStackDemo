import { createError, defineEventHandler, readBody } from "h3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import {
  assertAuthConfigured,
  createAuthToken,
  setAuthCookie,
  verifyPassword,
} from "../../utils/auth";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(128),
});

export default defineEventHandler(async (event) => {
  const result = loginSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "账号或密码格式不正确",
    });
  }

  assertAuthConfigured();
  const [user] = await getDb()
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.username, result.data.username))
    .limit(1);

  if (
    !user ||
    !(await verifyPassword(result.data.password, user.passwordHash))
  ) {
    throw createError({ statusCode: 401, statusMessage: "账号或密码错误" });
  }

  const token = createAuthToken(user.id);
  setAuthCookie(event, token);
  return { token, user: { id: user.id, username: user.username } };
});
