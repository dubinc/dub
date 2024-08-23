import { unstable_cache } from "next/cache";

export const getTotalEvents = unstable_cache(async (linkId: string) => {
  //   return await dub.analytics.retrieve({
  //     linkId,
  //     event: "composite",
  //     interval: "all_unfiltered",
  //   })

  return (await fetch(
    `https://api.dub.co/analytics?event=composite&groupBy=count&interval=all_unfiltered&linkId=${linkId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.DUB_API_KEY}`,
      },
    },
  ).then((res) => res.json())) as Promise<{
    clicks: number;
    leads: number;
    sales: number;
    amount: number;
  }>;
});
