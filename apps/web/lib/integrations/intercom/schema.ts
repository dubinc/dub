import * as z from "zod/v4";

export const intercomAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

// Integration credentials Dub stores
export const intercomCredentialsSchema = z.object({
  accessToken: z.string(),
  appId: z.string().describe("Intercom workspace ID."),
});

export const intercomContactSchema = z.object({
  id: z.string(),
  external_id: z.string().nullable(),
});

export const intercomUninstallWebhookSchema = z.object({
  app_id: z.string(),
});

export const intercomHealthCheckWebhookSchema = z.object({
  workspace_id: z.string(),
});

const intercomHealthCheckResponseSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("OK"),
  }),

  z.object({
    state: z.literal("UNHEALTHY"),
    message: z.string(),
    cta_type: z.literal("URL_CTA"),
    cta_label: z.string(),
    cta_url: z.url(),
  }),
]);

export const intercomAttachmentSchema = z.object({
  type: z.string(),
  name: z.string(),
  url: z.url(),
  content_type: z.string(),
  filesize: z.number(),
});

export const intercomConversationRepliedSchema = z.object({
  item: z.object({
    id: z.string(),
    type: z.string(),
    contacts: z.object({
      contacts: z.array(intercomContactSchema),
    }),
    conversation_parts: z.object({
      conversation_parts: z.array(
        z.object({
          type: z.string(),
          id: z.string(),
          body: z.string().nullable(),
          author: z.object({
            type: z.string(),
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
          attachments: z.array(intercomAttachmentSchema),
          app_package_code: z
            .string()
            .nullable()
            .describe(
              "The app package code if this part was created via API. null if the part was not created via API.",
            ),
        }),
      ),
    }),
  }),
});

export const intercomWebhookSchema = z.discriminatedUnion("topic", [
  z.object({
    topic: z.literal("conversation.admin.replied"),
    app_id: z.string(),
    data: intercomConversationRepliedSchema,
  }),

  z.object({
    topic: z.literal("ping"),
    app_id: z.string(),
    data: z.unknown(),
  }),
]);

export type IntercomCredentials = z.infer<typeof intercomCredentialsSchema>;

export type IntercomContact = z.infer<typeof intercomContactSchema>;

export type IntercomAttachment = z.infer<typeof intercomAttachmentSchema>;

export type IntercomHealthCheckResponse = z.infer<
  typeof intercomHealthCheckResponseSchema
>;
