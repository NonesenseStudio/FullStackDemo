import { eq } from "drizzle-orm";
import { createError, defineEventHandler, getQuery } from "h3";
import { users } from "../../db/scheme";
import { getDb } from "../../utils/db";
import { userIdSchema } from "../../utils/user-validation";

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);
  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) {
    throw createError({ statusCode: 400, statusMessage: "用户编号无效" });
  }

  const [deleted] = await getDb()
    .delete(users)
    .where(eq(users.id, parsedId.data))
    .returning({ id: users.id });
  if (!deleted)
    throw createError({ statusCode: 404, statusMessage: "用户不存在" });
  return { deleted: true, id: deleted.id };
});
