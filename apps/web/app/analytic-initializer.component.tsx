"use client";

import { useUserCache } from "@/lib/swr/use-user.ts";
import { useEffect } from "react";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
} from "../core/integration/analytic";

interface IAnalyticInitializerProps {
  sessionId: string;
}

export const AnalyticInitializerComponent = ({
  sessionId,
}: IAnalyticInitializerProps) => {
  const { user, isAuthorized } = useUserCache();

  useEffect(() => {
    if (isAuthorized && user) {
      setPeopleAnalytic({ $email: user.email });
      initPeopleAnalytic(user.id);
    } else {
      initPeopleAnalytic(sessionId);
    }
  }, [isAuthorized, user, sessionId]);

  return null;
};
