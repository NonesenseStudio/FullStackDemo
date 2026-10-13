import { z } from "zod";

const positiveInteger = z.string().regex(/^[1-9]\d*$/).transform(Number)
  .pipe(z.number().int().positive());

export const paginationQuerySchema = z.object({
  page: positiveInteger.default(1),
  pageSize: positiveInteger.pipe(z.number().max(100)).default(10),
});

export const paginationBodySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

export function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}
