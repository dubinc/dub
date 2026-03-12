import { BountyType } from "@dub/prisma/client";
import * as z from "zod/v4";

export const GroupBountySummarySchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled bounty"),
  type: z.enum(BountyType),
});
