import { ReferralsEmbedLinkSchema } from "@/lib/zod/schemas/referrals-embed";
import * as z from "zod/v4";

export type ReferralsEmbedLink = z.infer<typeof ReferralsEmbedLinkSchema>;
