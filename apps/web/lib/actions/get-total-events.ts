"use server";

import { dub } from "@/lib/dub";
import { AnalyticsCount } from "dub/dist/commonjs/models/components";
import { unstable_cache } from "next/cache";

export const getTotalEvents = unstable_cache(async (linkId: string) => {
  return (await dub.analytics.retrieve({
    linkId,
    event: "composite",
    interval: "all_unfiltered",
  })) as AnalyticsCount;
});
