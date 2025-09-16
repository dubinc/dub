import { parseUrlSchema } from "@/lib/zod/schemas/utils";
import { z } from "zod";

export const trackOpenRequestSchema = z
  .object({
    deepLink: parseUrlSchema
      .optional()
      .describe(
        "The deep link that brought the user to the app. If left blank, Dub will fallback to probabilistic tracking by using the `dubDomain` parameter to check if there is an associated click event for the user's IP address. Learn more: https://d.to/ddl",
      ),
    dubDomain: z
      .string()
      .optional()
      .describe(
        "Your deep link custom domain on Dub (e.g. `acme.link`). This is used in probabilistic tracking to check if there is an associated click event for the user's IP address. Learn more: https://d.to/ddl",
      ),
  })
  .superRefine((data, ctx) => {
    if (!data.deepLink && !data.dubDomain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "You need to provide either `deepLink` or `dubDomain` for deferred deep linking.",
      });
    }
  });

export const trackOpenResponseSchema = z.object({
  clickId: z
    .string()
    .nullable()
    .describe(
      "The click ID of the associated open event (or the prior click that led the user to the app store for probabilistic tracking). This will be `null` if the open event was not associated with a link (e.g. a direct download from the app store). Learn more: https://d.to/ddl",
    ),
  link: z
    .object({
      id: z.string().describe("The ID of the deep link.").openapi({
        example: "link_xxx",
      }),
      domain: z.string().describe("The domain of the deep link.").openapi({
        example: "acme.link",
      }),
      key: z.string().describe("The key of the deep link.").openapi({
        example: "fb-promo",
      }),
      url: z.string().describe("The URL of the deep link.").openapi({
        example: "https://acme.com/product/123",
      }),
    })
    .nullable()
    .describe(
      "The deep link that brought the user to the app. This will be `null` if the open event was not associated with a link (e.g. a direct download from the app store). Learn more: https://d.to/ddl",
    ),
});
