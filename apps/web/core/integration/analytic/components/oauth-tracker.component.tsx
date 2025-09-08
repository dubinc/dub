"use client";

import { FC, useEffect } from "react";
import {
  setPeopleAnalyticOnce,
  stopSessionRecording,
  trackClientEvents,
} from "../index.ts";
import { EAnalyticEvents } from "../interfaces/analytic.interface.ts";

interface IOauthTrackerProps {
  oauthData: any;
}

export const OauthTrackerComponent: FC<Readonly<IOauthTrackerProps>> = ({
  oauthData,
}) => {
  useEffect(() => {
    const { flow, provider, email, userId, signupOrigin } = oauthData ?? {};

    trackClientEvents({
      event: EAnalyticEvents.AUTH_SUCCESS,
      params: {
        page_name: "profile",
        auth_type: flow === "signup" ? "signup" : "login",
        auth_method: provider,
        ...(flow === "signup" ? { auth_origin: signupOrigin ?? "none" } : {}),
        email,
        event_category: "Authorized",
      },
      sessionId: userId,
    });

    stopSessionRecording();

    if (flow === "signup") {
      setPeopleAnalyticOnce({ signup_method: provider });
    }
  }, []);

  return null;
};
