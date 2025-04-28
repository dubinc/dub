"use client";

import { TabSelect } from "@dub/ui";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

export function ProgramSettingsHeader({
  slug,
  programId,
}: {
  slug: string;
  programId: string;
}) {
  const router = useRouter();

  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <TabSelect
        variant="accent"
        options={[
          {
            id: "rewards",
            label: "Rewards",
            href: `/${slug}/programs/${programId}/settings/rewards`,
          },
          {
            id: "discounts",
            label: "Discounts",
            href: `/${slug}/programs/${programId}/settings/discounts`,
          },
          {
            id: "links",
            label: "Links",
            href: `/${slug}/programs/${programId}/settings/links`,
          },
          {
            id: "branding",
            label: "Branding",
            href: `/${slug}/programs/${programId}/settings/branding`,
          },
        ]}
        selected={page}
      />
    </div>
  );
}
