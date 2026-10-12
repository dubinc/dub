import * as z from "zod/v4";

// GET /v2/user/info/ query params
export const getUserInfoInputSchema = z.object({
  fields: z.string(),
});

// GET /v2/user/info/ response
export const getUserInfoOutputSchema = z.object({
  data: z.object({
    user: z.object({
      username: z.string(),
    }),
  }),
});
