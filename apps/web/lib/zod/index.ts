import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const getLinksCountParamsSchema = z.object({
  userId: z.string().optional(),
  tagId: z.string().optional(),
  domain: z.string().optional(),
  showArchived: z.coerce.boolean().optional(),
  search: z.string().optional(),
  groupBy: z.union([z.literal("domain"), z.literal("tagId")]).optional(),
});

export const domainKeySchema = z.object({
  domain: z.string().min(1),
  key: z.string().min(1),
});

export type GetLinksCountParams = z.infer<typeof getLinksCountParamsSchema>;
