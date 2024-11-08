import { z } from "zod";
import {
  dotsAppSchema,
  dotsFlowStepsSchema,
  dotsTransfersSchema,
  dotsUserSchema,
} from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;

export type DotsTransfers = z.infer<typeof dotsTransfersSchema>;

export type DotsUser = z.infer<typeof dotsUserSchema>;

export type DotsFlowSteps = z.infer<typeof dotsFlowStepsSchema>;
