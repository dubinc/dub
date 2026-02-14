import {
  createPartnerPostbackInputSchema,
  createPartnerPostbackOutputSchema,
  partnerPostbackSchema,
  updatePartnerPostbackInputSchema,
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
        body: createPartnerPostbackInputSchema,
        output: createPartnerPostbackOutputSchema,
      },

      // Update postback
      "/api/partner-profile/postbacks/:postbackId": {
        method: "patch",
        params: z.object({
          postbackId: z.string(),
        }),
        body: updatePartnerPostbackInputSchema,
        output: partnerPostbackSchema,
      },
    },
    {
      strict: true,
    },
  ),
});
