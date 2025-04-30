import z from "@/lib/zod";

export const metaTagsSchema = z.object({
  title: z
    .string()
    .nullable()
    .describe("The meta title tag for the URL.")
    .openapi({
      example: "GetQR | Create Custom QR Codes with Logo, Colors & Tracking",
    }),
  description: z
    .string()
    .nullable()
    .describe("The meta description tag for the URL.")
    .openapi({
      example:
        "Design dynamic QR codes with logos, frames, and colors. Track scans, edit content anytime, and download in JPG, PNG, or SVG. Start free—no credit card needed.",
    }),
  image: z
    .string()
    .nullable()
    .describe("The OpenGraph image for the URL.")
    .openapi({ example: "https://assets.dub.co/thumbnail.jpg" }),
});
