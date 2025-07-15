"use client";

import HelpPhone from "@/ui/shared/icons/customer-support.tsx";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import Link from "next/link";

export const CustomerSupport = () => {
  const onClickHandler = (contentValue: string) => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: contentValue,
        event_category: "unAuthorized",
      },
    });
  };

  return (
    <div className="text-neutral mr-20 max-md:mt-6">
      <p className="mb-4 text-lg font-semibold">Customer Support</p>
      <Link
        className="text-neutral text-base font-medium"
        href="/help/cancel-my-subscription"
        target="_blank"
        onClick={() => onClickHandler("how_to_cancel")}
      >
        How to Cancel
      </Link>
      <Link
        className="my-3 flex h-[44px] w-full items-center justify-center gap-3 rounded-full border border-black px-4 py-2 text-sm font-medium"
        href="/help"
        target="_blank"
        onClick={() => onClickHandler("customer_support")}
      >
        <HelpPhone className="h-6 w-6" />
        Customer Support <br />
        24/7/365
      </Link>
    </div>
  );
};
