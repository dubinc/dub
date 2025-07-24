"use client";

import { useUserCache } from "@/lib/swr/use-user.ts";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
} from "core/integration/analytic";
import { useEffect } from "react";

interface IAnalyticInitializerProps {
  sessionId: string;
}

export const AnalyticInitializerComponent = ({
  sessionId,
}: IAnalyticInitializerProps) => {
  const { user, isAuthorized } = useUserCache();
  // const [guestSessionId, setGuestSessionId] = useLocalStorage<string | null>(
  //   `guest-session-id`,
  //   null,
  // );

  useEffect(() => {
    if (isAuthorized && user) {
      // if (guestSessionId) {
      //   initPeopleAnalytic(guestSessionId);
      //   setGuestSessionId(null);
      // }
      initPeopleAnalytic(user.id);
      setPeopleAnalytic({ $email: user.email });
    } else {
      initPeopleAnalytic(sessionId);
    }
  }, [isAuthorized, user]);

  return null;
};
