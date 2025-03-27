import { z } from "zod";
import { programLanderAccordionItemSchema } from "./program-lander";

export const programEmbedSchema = z
  .object({
    faq: z.array(programLanderAccordionItemSchema).nullish(),
    leaderboard: z
      .object({
        mode: z.enum(["enabled", "disabled"]).default("enabled"),
      })
      .nullish(),
  })
  .nullish();
