import * as z from "zod/v4";

export const intercomAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

// Integration credentials
export const intercomCredentialsSchema = z.object({
  accessToken: z.string(),
  appId: z.string().describe("Intercom workspace ID."),
});

export const intercomContactSchema = z.object({
  id: z.string(),
  external_id: z.string().nullable(),
});

export const intercomUninstallWebhookSchema = z.object({
  app_id: z.string().describe("Intercom workspace ID."),
});

export const intercomWebhookSchema = z.object({
  app_id: z.string().optional().describe("Intercom workspace ID."),
  topic: z.string(),
  data: z.object({
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
            body: z.string(),
            author: z.object({
              type: z.string(),
              id: z.string(),
              name: z.string(),
              email: z.string(),
            }),
            attachments: z.array(
              z.object({
                type: z.string(),
                name: z.string(),
                url: z.url(),
                content_type: z.string(),
              }),
            ),
            app_package_code: z
              .string()
              .describe(
                "The app package code if this part was created via API. null if the part was not created via API.",
              ),
          }),
        ),
      }),
    }),
  }),
});

export type IntercomCredentials = z.infer<typeof intercomCredentialsSchema>;

export type IntercomContact = z.infer<typeof intercomContactSchema>;
