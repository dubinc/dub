"use server";

import { API_DOMAIN } from "@dub/utils";
import { AnalyticsCount } from "dub/dist/commonjs/models/components";

export const getTotalEvents = async (linkId: string) => {
  // return (await dub.analytics.retrieve({
  //   linkId,
  //   event: "composite",
  //   interval: "all_unfiltered",
  // })) as AnalyticsCount;
  return (await fetch(
    `${API_DOMAIN}/analytics?linkId=${linkId}&event=composite&interval=all_unfiltered`,
    {
      headers: {
        Authorization: `Bearer ${process.env.DUB_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json())) as AnalyticsCount;
};
