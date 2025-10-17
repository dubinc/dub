"use client";

import HelpPhone from "@/ui/shared/icons/customer-support.tsx";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import Link from "next/link";
import { FC } from "react";

interface ICustomerSupportProps {
  sessionId: string;
}

export const CustomerSupport: FC<Readonly<ICustomerSupportProps>> = ({
  sessionId,
}) => {
  const onClickHandler = (contentValue: string) => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: contentValue,
        event_category: "nonAuthorized",
      },
      sessionId,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-lg font-medium">Customer Support</div>
      <ul className="text-muted-foreground space-y-3">
        <li>
          <Link
            href="/help/cancel-my-subscription"
            target="_blank"
            onClick={() => onClickHandler("how_to_cancel")}
            className="transition-colors hover:text-foreground"
          >
            How to Cancel
          </Link>
        </li>
        <li>
          <Link
            className="group inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5"
            href="/help"
            target="_blank"
            onClick={() => onClickHandler("customer_support")}
          >
            <div className="rounded-full bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
              <HelpPhone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-foreground font-semibold">Customer Support</span>
              <span className="text-muted-foreground text-xs">24/7/365</span>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
};
