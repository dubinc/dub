import { z } from "zod";
import {
  dotsAppSchema,
  dotsPayoutMethodSchema,
  dotsTransfersSchema,
} from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;

export type DotsTransfers = z.infer<typeof dotsTransfersSchema>;

export type DotsPayoutMethod = z.infer<typeof dotsPayoutMethodSchema>;

export type DotsPayoutMethods = DotsPayoutMethod[];
