import { z } from "@hono/zod-openapi";

export const TagSchema = z.object({
  id: z.string().openapi({ description: "The unique ID of the tag." }),
  name: z.string().openapi({ description: "The name of the tag." }),
  color: z.string().openapi({ description: "The color of the tag." }),
});
