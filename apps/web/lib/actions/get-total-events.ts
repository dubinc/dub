"use server";

import { dub } from "@/lib/dub";
import { AnalyticsCount } from "dub/dist/commonjs/models/components";

export const getTotalEvents = async (linkId: string) => {
  return (await dub.analytics.retrieve({
    linkId,
    event: "composite",
    interval: "all_unfiltered",
  })) as AnalyticsCount;
};
