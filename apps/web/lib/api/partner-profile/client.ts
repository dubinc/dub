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

      // Get postback
      "@get/api/partner-profile/postbacks/:postbackId": {
        params: z.object({
          postbackId: z.string(),
        }),
        output: partnerPostbackSchema,
      },

      // Update postback
      "@patch/api/partner-profile/postbacks/:postbackId": {
        params: z.object({
          postbackId: z.string(),
        }),
        body: updatePartnerPostbackInputSchema,
        output: partnerPostbackSchema,
      },

      // Delete postback
      "@delete/api/partner-profile/postbacks/:postbackId": {
        params: z.object({
          postbackId: z.string(),
        }),
        output: z.object({
          id: z.string(),
        }),
      },

      // Rotate postback secret
      "@post/api/partner-profile/postbacks/:postbackId/rotate-secret": {
        params: z.object({
          postbackId: z.string(),
        }),
        output: z.object({
          secret: z.string(),
        }),
      },
    },
    {
      strict: true,
    },
  ),
});
