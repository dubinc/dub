"use client";

import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import Link from "next/link";
import { FC } from "react";

type TLink = {
  href: string;
  text: string;
  page_name_code?: string;
};

interface ILinksProps {
  title: string;
  links: TLink[];
  sessionId: string;
}

export const Links: FC<ILinksProps> = ({ title, links, sessionId }) => {
  const onClickHandler = (contentValue: string) => {
    if (contentValue) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_CLICKED,
        params: {
          page_name: "landing",
          content_value: contentValue,
          event_category: "nonAuthorized",
        },
        sessionId,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-lg font-medium">{title}</div>
      <ul className="text-muted-foreground space-y-3">
        {links.map((link, index) => (
          <li key={index}>
            <Link
              href={link.href}
              target="_blank"
              onClick={() => onClickHandler(link?.page_name_code ?? "")}
            >
              {link.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
