"use client";

import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";

import { FC, useEffect } from "react";

interface IHelpCenterTrackerComponentProps {
  isAuthorized: boolean;
  sessionId: string;
}

export const HelpCenterTrackerComponent: FC<
  Readonly<IHelpCenterTrackerComponentProps>
> = ({ isAuthorized, sessionId }) => {
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    let pageName: string | null = null;

    switch (true) {
      case pathname.includes("/help/cancel-my-subscription"):
        pageName = "cancel_subscription";
        break;
      case pathname.includes("/help/help-getqr-support"):
        pageName = "contact_support";
        break;
      default:
        break;
    }

    if (pageName) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_VIEWED,
        params: {
          page_name: pageName,
          event_category: isAuthorized ? "Authorized" : "nonAuthorized",
        },
        sessionId,
      });
    }

    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof HTMLAnchorElement) {
        let contentValue: string | null = null;

        switch (true) {
          case event.target.href.includes("/cancellation"):
            event.preventDefault();

            contentValue = "cancellation_portal";
            break;
          case event.target.href.includes("@"):
            contentValue = "email";
            break;
          case event.target.href.endsWith("/help"):
            event.preventDefault();
            contentValue = "help_articles";
            break;
          default:
            break;
        }

        if (contentValue) {
          trackClientEvents({
            event: EAnalyticEvents.PAGE_CLICKED,
            params: {
              page_name: pageName,
              content_value: contentValue,
              event_category: isAuthorized ? "Authorized" : "nonAuthorized",
            },
            sessionId,
          });

          if (contentValue !== "email") {
            router.push(event.target.href);
          }
        }
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [pathname]);

  return null;
};
