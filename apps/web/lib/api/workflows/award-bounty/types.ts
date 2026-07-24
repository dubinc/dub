import type * as z from "zod/v4";
import type { awardBountyConditionSchema } from "./schema";

export type AwardBountyCondition = z.infer<typeof awardBountyConditionSchema>;
