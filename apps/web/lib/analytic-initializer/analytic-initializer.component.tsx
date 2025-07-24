"use client";

import { Session } from "@/lib/auth";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
  startSessionRecording,
} from "core/integration/analytic";
import { useEffect } from "react";

interface IAnalyticInitializerProps {
  sessionId: string; // твой кастомный уникальный айди гостя
  authSession: Session | null;
}

export const AnalyticInitializerComponent = ({
  authSession,
  sessionId,
}: IAnalyticInitializerProps) => {
  useEffect(() => {
    if (!authSession || !authSession?.user) {
      // initPeopleAnalytic(sessionId);
      startSessionRecording();
    }

    if (authSession?.user) {
      initPeopleAnalytic(authSession.user.id);
      setPeopleAnalytic({ $email: authSession.user.email });
    }
  }, []);

  return null;
};
