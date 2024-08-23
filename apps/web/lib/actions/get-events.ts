import { unstable_cache } from "next/cache";
import { EventType } from "../analytics/types";

export const getEvents = unstable_cache(
  async ({
    linkId,
    event,
    page,
  }: {
    linkId: string;
    event: EventType;
    page: number;
  }) => {
    // const eventsParams = {
    //   linkId: link.id,
    //   event,
    // };

    // const events = await dub.events.list({
    //   ...eventsParams,
    //   interval: "all",
    //   page,
    // });

    return await fetch(
      `https://api.dub.co/events?event=${event}&interval=all&linkId=${linkId}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DUB_API_KEY}`,
        },
      },
    ).then((res) => res.json());
  },
);
