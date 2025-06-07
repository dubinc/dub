"use client";

import { ToggleGroup } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function ProgramBrandingTabs({
  slug,
  programId,
}: {
  slug: string;
  programId: string;
}) {
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page =
    selectedLayoutSegment === null ? "elements" : selectedLayoutSegment;

  return (
    <ToggleGroup
      className="rounded-lg bg-neutral-50 p-0.5"
      indicatorClassName="rounded-md bg-white"
      optionClassName="text-xs py-[0.3125rem] px-2.5 normal-case"
      options={[
        {
          value: "elements",
          label: "Brand elements",
          href: `/${slug}/program/branding`,
        },
        {
          value: "resources",
          label: "Brand assets",
          href: `/${slug}/program/branding/resources`,
        },
      ]}
      selected={page}
    />
  );
}
