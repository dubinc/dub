import { z } from "zod";
import { dotsAppSchema, dotsTransfersSchema } from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;

export type DotsTransfers = z.infer<typeof dotsTransfersSchema>;
