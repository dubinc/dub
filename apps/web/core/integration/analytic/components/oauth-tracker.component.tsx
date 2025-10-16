"use client";

import { FC, useEffect } from "react";
import { setPeopleAnalyticOnce, trackClientEvents } from "../index.ts";
import { EAnalyticEvents } from "../interfaces/analytic.interface.ts";

interface IOauthTrackerProps {
  oauthData: any;
}

export const OauthTrackerComponent: FC<Readonly<IOauthTrackerProps>> = ({
  oauthData,
}) => {
  useEffect(() => {
    const { provider, email, userId } = oauthData ?? {};

    trackClientEvents({
      event: EAnalyticEvents.AUTH_SUCCESS,
      params: {
        page_name: "dashboard",
        auth_type: "login",
        auth_method: provider,
        email,
        event_category: "Authorized",
      },
      sessionId: userId,
    });
  }, []);

  return null;
};
