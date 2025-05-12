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
              id: "elements",
              label: "Brand elements",
              href: `/${slug}/programs/${programId}/branding/elements`,
            },
            {
              id: "resources",
              label: "Brand assets",
              href: `/${slug}/programs/${programId}/branding/resources`,
            },
          ]}
          selected={page}
        />
      </div>
    </div>
  );
}
