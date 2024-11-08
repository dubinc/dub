import { z } from "zod";
import {
  dotsAppSchema,
  dotsFlowStepsSchema,
  dotsPayoutPlatforms,
  dotsTransfersSchema,
  dotsUserSchema,
  payoutMethodSchema,
} from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;

export type DotsTransfers = z.infer<typeof dotsTransfersSchema>;

export type PayoutMethod = z.infer<typeof payoutMethodSchema>;

export type DotsUser = z.infer<typeof dotsUserSchema>;

export type DotsFlowSteps = z.infer<typeof dotsFlowStepsSchema>;

export type DotsPayoutPlatform = z.infer<typeof dotsPayoutPlatforms>;
