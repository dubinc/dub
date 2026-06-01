import {
  createPostbackInputSchema,
  createPostbackOutputSchema,
  postbackSchema,
  sendTestPostbackInputSchema,
  updatePostbackInputSchema,
} from "@/lib/postback/schemas";
import {
  assignProgramInputSchema,
  assignedProgramOutputSchema,
} from "@/lib/zod/schemas/partner-profile";
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

      // Get postback
      "@get/api/partner-profile/postbacks/:postbackId": {
        params: z.object({
          postbackId: z.string(),
        }),
        output: postbackSchema,
      },

      // Update postback
      "@patch/api/partner-profile/postbacks/:postbackId": {
        params: z.object({
          postbackId: z.string(),
        }),
        body: updatePostbackInputSchema,
        output: postbackSchema,
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

      // Send test postback event
      "@post/api/partner-profile/postbacks/:postbackId/send-test": {
        params: z.object({
          postbackId: z.string(),
        }),
        body: sendTestPostbackInputSchema,
        output: z.object({}),
      },

      // Set assigned programs for a user
      "@put/api/partner-profile/users/:userId/programs": {
        params: z.object({
          userId: z.string(),
        }),
        body: assignProgramInputSchema,
        output: z.array(assignedProgramOutputSchema),
      },
    },
    {
      strict: true,
    },
  ),
});
