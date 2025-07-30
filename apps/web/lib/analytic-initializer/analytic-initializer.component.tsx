"use client";

import { Session } from "@/lib/auth";
import { useQuerySearchParams } from "@/lib/hooks/query-search-params.hook.tsx";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
  setPeopleAnalyticOnce,
  startSessionRecording,
} from "core/integration/analytic";
import { useEffect } from "react";

interface IAnalyticInitializerProps {
  sessionId: string;
  authSession: Session | null;
}

export const AnalyticInitializerComponent = ({
  authSession,
}: IAnalyticInitializerProps) => {
  const { searchParams, changeQuery } = useQuerySearchParams();
  const fromEmailQuery = searchParams.get("marketing");

  useEffect(() => {
    if (!authSession || !authSession?.user) {
      // initPeopleAnalytic(sessionId);
      startSessionRecording();

      if (fromEmailQuery && fromEmailQuery === "true") {
        localStorage.setItem("fromEmailQuery", "true");
      }
    }

    if (authSession?.user) {
      initPeopleAnalytic(authSession.user.id);
      setPeopleAnalytic({ $email: authSession.user.email });

      const emailMarketingFromLS = localStorage.getItem("fromEmailQuery");
      if (fromEmailQuery && fromEmailQuery === "true") {
        setPeopleAnalyticOnce({ email_marketing: true });
        changeQuery("marketing", "");
        localStorage.removeItem("fromEmailQuery");
      } else if (emailMarketingFromLS && emailMarketingFromLS === "true") {
        setPeopleAnalyticOnce({ email_marketing: true });
        localStorage.removeItem("fromEmailQuery");
      }
    }
  }, []);

  return null;
};
