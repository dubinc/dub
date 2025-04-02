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
          { id: "rewards", label: "Rewards" },
          { id: "discounts", label: "Discounts" },
          { id: "links", label: "Links" },
          { id: "branding", label: "Branding" },
        ]}
        selected={page}
        onSelect={(id) => {
          router.push(`/${slug}/programs/${programId}/settings/${id}`);
        }}
      />
    </div>
  );
}
