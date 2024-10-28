import { z } from "zod";
import { dotsAppSchema } from "./schemas";

export type DotsApp = z.infer<typeof dotsAppSchema>;
