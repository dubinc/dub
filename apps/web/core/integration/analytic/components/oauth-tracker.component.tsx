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
    const { flow, provider, email, userId } = oauthData;

    trackClientEvents({
      event:
        flow === "signup"
          ? EAnalyticEvents.SIGNUP_SUCCESS
          : EAnalyticEvents.LOGIN_SUCCESS,
      params: {
        page_name: "profile",
        method: provider,
        email,
        event_category: "Authorized",
      },
      sessionId: userId,
    });

    if (flow === "signup") {
      setPeopleAnalyticOnce({ signup_method: provider });
    }
  }, []);

  return null;
};
