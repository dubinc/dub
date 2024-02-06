import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export const GetLinksCountParamsSchema = z.object({
  userId: z.string().optional(),
  tagId: z.string().optional(),
  domain: z.string().optional(),
  showArchived: z.coerce.boolean().optional(),
  search: z.string().optional(),
  groupBy: z.union([z.literal("domain"), z.literal("tagId")]).optional(),
});

export type GetLinksCountParams = z.infer<typeof GetLinksCountParamsSchema>;

export default z;
