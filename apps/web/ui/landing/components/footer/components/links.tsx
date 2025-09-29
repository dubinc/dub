"use client";

import { Text } from "@radix-ui/themes";
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
    <ul className="text-neutral flex flex-col gap-2">
      <Text size={{ initial: "3", md: "4" }} weight="bold" className="mb-2">
        {title}
      </Text>
      {links.map((link, index) => (
        <li key={index}>
          <Link
            className="text-sm font-normal md:text-base"
            href={link.href}
            target="_blank"
            onClick={() => onClickHandler(link?.page_name_code ?? "")}
          >
            {link.text}
          </Link>
        </li>
      ))}
    </ul>
  );
};
