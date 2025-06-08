"use client";

import { TabSelect } from "@dub/ui";
import { useParams, useSelectedLayoutSegment } from "next/navigation";

export function ProgramSettingsHeader() {
  const { slug } = useParams();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <div className="scrollbar-hide overflow-x-auto">
        <TabSelect
          variant="accent"
          options={[
            {
              id: "rewards",
              label: "Rewards",
              href: `/${slug}/program/settings/rewards`,
            },
            {
              id: "discounts",
              label: "Discounts",
              href: `/${slug}/program/settings/discounts`,
            },
            {
              id: "links",
              label: "Links",
              href: `/${slug}/program/settings/links`,
            },
            {
              id: "communication",
              label: "Communication",
              href: `/${slug}/program/settings/communication`,
            },
          ]}
          selected={page}
        />
      </div>
    </div>
  );
}
