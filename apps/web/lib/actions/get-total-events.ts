"use server";

import { AnalyticsCount } from "dub/dist/commonjs/models/components";

export const getTotalEvents = async (linkId: string) => {
  // return (await dub.analytics.retrieve({
  //   linkId,
  //   event: "composite",
  //   interval: "all_unfiltered",
  // })) as AnalyticsCount;
  return (await fetch(
    `https://api.dub.co/analytics?linkId=${linkId}&event=composite&interval=all_unfiltered`,
    {
      headers: {
        Authorization: `Bearer ${process.env.DUB_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json())) as AnalyticsCount;
};
