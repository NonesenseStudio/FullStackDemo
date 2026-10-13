import { z } from "zod";

export const userIdSchema = z.coerce.number().int().positive();

export const createUserSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(128),
});

export const updateUserSchema = createUserSchema
  .partial()
  .extend({ id: userIdSchema });
