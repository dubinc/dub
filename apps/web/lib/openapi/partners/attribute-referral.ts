import { openApiErrorResponses } from "@/lib/openapi/responses";
import { attributeReferringPartnerBodySchema } from "@/lib/partner-referrals/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const attributeReferral: ZodOpenApiOperationObject = {
  operationId: "attributeReferringPartner",
  "x-speakeasy-name-override": "attributeReferral",
  "x-speakeasy-max-method-params": 2,
  summary: "Attribute a referring partner",
  description:
    "Attribute a partner to the partner who referred them. When `createCommissionsForPastEvents` is true and the referring partner has a referral reward, referral commissions for past eligible events are enqueued and created asynchronously. They are not created in this request.",
  requestParams: {
    path: z.object({
      partnerId: z
        .string()
        .describe("The ID of the partner to attribute a referrer to."),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: attributeReferringPartnerBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The partner was attributed to the referring partner.",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z
              .string()
              .describe("The ID of the partner who was attributed."),
            referredByPartnerId: z
              .string()
              .describe("The ID of the referring partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
