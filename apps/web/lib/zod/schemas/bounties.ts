import { BountyType } from "@dub/prisma/client";
import { z } from "zod";
import { parseDateSchema } from "./utils";

export const createBountySchema = z.object({
  type: z.nativeEnum(BountyType),
  startsAt: parseDateSchema,
  endsAt: parseDateSchema.nullish(),
  rewardAmount: z.number().min(0),
});
