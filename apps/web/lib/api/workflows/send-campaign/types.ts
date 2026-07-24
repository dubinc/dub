import type * as z from "zod/v4";

import type { sendCampaignConditionSchema } from "./schema";

export type SendCampaignCondition = z.infer<typeof sendCampaignConditionSchema>;
