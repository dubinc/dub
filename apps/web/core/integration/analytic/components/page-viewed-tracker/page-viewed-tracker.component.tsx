"use client";

import { FC, useEffect, useState } from "react";
import { EAnalyticEvents } from "../../interfaces/analytic.interface.ts";
import { trackClientEvents } from "../../services/analytic.service.ts";

interface IPageViewedTrackerProps {
  sessionId: string;
  pageName: string;
  params: { [key: string]: string | null };
}

const waitForGoogleAnalytics = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50;

    const checkGtag = () => {
      attempts++;

      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        resolve();
      } else if (attempts < maxAttempts) {
        setTimeout(checkGtag, 100);
      } else {
        resolve();
      }
    };

    checkGtag();
  });
};

export const PageViewedTrackerComponent: FC<
  Readonly<IPageViewedTrackerProps>
> = ({ sessionId, pageName, params }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    waitForGoogleAnalytics().then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_VIEWED,
        params: {
          page_name: pageName,
          ...params,
        },
        sessionId,
      });
    }
  }, [isReady, pageName, sessionId, params]);

  return null;
};
