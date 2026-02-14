import {
  createPostbackInputSchema,
  createPostbackOutputSchema,
  postbackSchema,
  updatePostbackSchema,
} from "@/lib/postback/schemas";
import { createFetch, createSchema } from "@better-fetch/fetch";
import * as z from "zod/v4";

export const partnerProfileFetch = createFetch({
  baseURL: "",
  credentials: "include",
  schema: createSchema(
    {
      // Create postback
      "/api/partner-profile/postbacks": {
        method: "post",
        body: createPostbackInputSchema,
        output: createPostbackOutputSchema,
      },

      // Update postback
      "/api/partner-profile/postbacks/:postbackId": {
        method: "patch",
        params: z.object({
          postbackId: z.string(),
        }),
        body: updatePostbackSchema,
        output: postbackSchema,
      },
    },
    {
      strict: true,
    },
  ),
});
