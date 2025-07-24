"use client";

import { useUserCache } from "@/lib/swr/use-user.ts";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
  startSessionRecording,
  trackClientEvents,
} from "core/integration/analytic";
import { useEffect } from "react";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";

interface IAnalyticInitializerProps {
  sessionId: string;
}

export const AnalyticInitializerComponent = ({
  sessionId,
}: IAnalyticInitializerProps) => {
  const { user, isAuthorized } = useUserCache();

  useEffect(() => {
    if (isAuthorized && user) {
      trackClientEvents({
        event: EAnalyticEvents.IDENTIFY_EVENT,
      });

      initPeopleAnalytic(user.id);
      setPeopleAnalytic({ $email: user.email });
    } else {
      initPeopleAnalytic(sessionId);
      startSessionRecording();
    }
  }, [isAuthorized, user]);

  return null;
};
