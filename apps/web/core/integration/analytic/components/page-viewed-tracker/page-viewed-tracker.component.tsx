"use client";

import { FC, useEffect } from "react";
import { EAnalyticEvents } from "../../interfaces/analytic.interface.ts";
import { trackClientEvents } from "../../services/analytic.service.ts";

interface IPageViewedTrackerProps {
  sessionId: string;
  pageName: string;
  params: { [key: string]: string | null };
}

export const PageViewedTrackerComponent: FC<
  Readonly<IPageViewedTrackerProps>
> = ({ sessionId, pageName, params }) => {
  useEffect(() => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_VIEWED,
      params: {
        page_name: pageName,
        ...params,
      },
      sessionId,
    });
  }, [pageName]);

  return null;
};
