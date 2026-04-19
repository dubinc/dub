import * as z from "zod/v4";
import { programLanderAccordionItemSchema } from "./program-lander";

export const programEmbedSchema = z
  .object({
    faq: z.array(programLanderAccordionItemSchema).nullish(),
    leaderboard: z
      .object({
        mode: z.enum(["enabled", "disabled"]).default("enabled"),
      })
      .nullish(),
    hidePoweredByBadge: z.boolean().default(false),
    rewardDisplay: z
      .object({
        mode: z.enum(["currency", "custom"]).default("currency"),
        prefix: z.string().default(""),
        suffix: z.string().default(""),
        divisor: z.number().positive().default(100),
        compact: z.boolean().default(false),
      })
      .nullish(),
  })
  .nullish();
