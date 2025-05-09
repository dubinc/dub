"use client";

import { TabSelect } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function ProgramBrandingHeader({
  slug,
  programId,
}: {
  slug: string;
  programId: string;
}) {
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <div className="scrollbar-hide overflow-x-auto">
        <TabSelect
          variant="accent"
          options={[
            {
              id: "design",
              label: "Design",
              href: `/${slug}/programs/${programId}/branding/design`,
            },
            {
              id: "resources",
              label: "Resources",
              href: `/${slug}/programs/${programId}/branding/resources`,
            },
            {
              id: "landing",
              label: "Landing Page",
              href: `/${slug}/programs/${programId}/branding/landing`,
            },
          ]}
          selected={page}
        />
      </div>
    </div>
  );
}
