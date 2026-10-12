import {
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";
import { z } from "zod";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import {
  assertAuthConfigured,
  createAuthToken,
  hashPassword,
  setAuthCookie,
} from "../../utils/auth";

const registerSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(128),
});

function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueConstraintViolation(error.cause);
}

export default defineEventHandler(async (event) => {
  const result = registerSchema.safeParse(await readBody(event));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "账号或密码格式不正确",
    });
  }

  assertAuthConfigured();
  const passwordHash = await hashPassword(result.data.password);
  let user: { id: number; username: string } | undefined;

  try {
    [user] = await getDb()
      .insert(users)
      .values({ username: result.data.username, passwordHash })
      .returning({ id: users.id, username: users.username });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw createError({ statusCode: 409, statusMessage: "该账号已被使用" });
    }
    throw error;
  }

  if (!user) {
    throw createError({ statusCode: 500, statusMessage: "创建账号失败" });
  }

  setResponseStatus(event, 201);
  const token = createAuthToken(user.id);
  setAuthCookie(event, token);
  return { token, user };
});
