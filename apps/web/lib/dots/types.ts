import { z } from "zod";
import { dotsAppSchema, dotsTransactionsSchema } from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;

export type DotsTransactions = z.infer<typeof dotsTransactionsSchema>;
