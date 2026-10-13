import { z } from "zod";

export const menuIdSchema = z.coerce.number().int().positive();

export const createMenuSchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(100),
  routeName: z.string().trim().min(1).max(100),
  routePath: z.string().trim().min(1).max(255).refine((path) => path.startsWith("/"), {
    message: "路由路径必须以 / 开头",
  }),
  component: z.string().trim().min(1).max(255),
  pageMeta: z.record(z.string(), z.unknown()).default({}),
  icon: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().default(0),
  hidden: z.boolean().default(false),
});

export const updateMenuSchema = createMenuSchema
  .partial()
  .extend({ id: menuIdSchema });
