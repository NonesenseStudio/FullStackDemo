import { asc, eq } from "drizzle-orm";
import { createError, defineEventHandler, getQuery } from "h3";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { userIdSchema } from "../../utils/user-validation";

const publicUserFields = {
  id: users.id,
  username: users.username,
  createdAt: users.createdAt,
};

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);
  const db = getDb();

  if (id === undefined) {
    return db.select(publicUserFields).from(users).orderBy(asc(users.id));
  }

  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw createError({ statusCode: 400, statusMessage: "用户编号无效" });
  }

  const [user] = await db
    .select(publicUserFields)
    .from(users)
    .where(eq(users.id, parsedId.data))
    .limit(1);
  if (!user)
    throw createError({ statusCode: 404, statusMessage: "用户不存在" });
  return user;
});
