import { EAnalyticEvents } from "../interfaces/analytic.interface.ts";

interface ITrackMixpanelApiProps {
  email: string;
  userId: string;
  event: EAnalyticEvents;
  params: any;
}

export const trackMixpanelApiService = async ({
  email,
  userId,
  event,
  params,
}: ITrackMixpanelApiProps) => {
  const mixpanelResponse = await fetch("https://api.mixpanel.com/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        event,
        properties: {
          distinct_id: userId,
          email,
          mixpanel_user_id: userId,
          token: process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN,
          ...params,
        },
      },
    ]),
  });

  return mixpanelResponse;
};
