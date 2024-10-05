import {
  DEFAULT_BGCOLOR,
  DEFAULT_FGCOLOR,
  DEFAULT_INCLUDEMARGIN,
  QR_LEVELS,
} from "@/lib/qr/constants";
import z from "@/lib/zod";
import { booleanQuerySchema } from "./misc";
import { parseUrlSchema } from "./utils";

export const getQRCodeQuerySchema = z.object({
  url: parseUrlSchema.describe("The URL to generate a QR code for."),
  logo: z
    .string()
    .optional()
    .describe(
      "The logo to include in the QR code. Can only be used with a paid plan on Dub.co.",
    ),
  size: z.coerce
    .number()
    .optional()
    .default(600)
    .describe(
      "The size of the QR code in pixels. Defaults to `600` if not provided.",
    ),
  level: z
    .enum(QR_LEVELS)
    .optional()
    .default("L")
    .describe(
      "The level of error correction to use for the QR code. Defaults to `L` if not provided.",
    ),
  fgColor: z
    .string()
    .optional()
    .default(DEFAULT_FGCOLOR)
    .describe(
      "The foreground color of the QR code in hex format. Defaults to `#000000` if not provided.",
    ),
  bgColor: z
    .string()
    .optional()
    .default(DEFAULT_BGCOLOR)
    .describe(
      "The background color of the QR code in hex format. Defaults to `#ffffff` if not provided.",
    ),
  hideLogo: booleanQuerySchema
    .optional()
    .default("false")
    .describe(
      "Whether to hide the logo in the QR code. Can only be used with a paid plan on Dub.co.",
    ),
  includeMargin: booleanQuerySchema
    .optional()
    .default(`${DEFAULT_INCLUDEMARGIN}`)
    .describe(
      "Whether to include a margin around the QR code. Defaults to `false` if not provided.",
    ),
});
