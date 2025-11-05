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
    <Link
      className="border-border bg-card hover:border-primary hover:bg-primary/5 group inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all"
      href="/help"
      target="_blank"
      onClick={() => onClickHandler("customer_support")}
    >
      <div className="bg-primary/10 group-hover:bg-primary/20 rounded-full p-2 transition-colors">
        <HelpPhone className="text-primary h-5 w-5" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-foreground font-semibold">
          Customer Support
        </span>
        <span className="text-muted-foreground text-xs">24/7/365</span>
      </div>
    </Link>
  );
};
