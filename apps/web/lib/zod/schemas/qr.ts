import z from "@/lib/zod";

export const getQRCodeQuerySchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .default("https://dub.co")
    .describe(
      "The URL to generate a QR code for. Defaults to `https://dub.co` if not provided.",
    ),
  size: z
    .number()
    .optional()
    .default(600)
    .describe(
      "The size of the QR code in pixels. Defaults to `600` if not provided.",
    ),
  level: z
    .enum(["L", "M", "Q", "H"])
    .optional()
    .default("L")
    .describe(
      "The level of error correction to use for the QR code. Defaults to `L` if not provided.",
    ),
  fgColor: z
    .string()
    .optional()
    .default("#000000")
    .describe(
      "The foreground color of the QR code in hex format. Defaults to `#000000` if not provided.",
    ),
  bgColor: z
    .string()
    .optional()
    .default("#ffffff")
    .describe(
      "The background color of the QR code in hex format. Defaults to `#ffffff` if not provided.",
    ),
  includeMargin: z.coerce
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Whether to include a margin around the QR code. Defaults to `false` if not provided.",
    ),
});
