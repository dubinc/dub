"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader({
  baseUrl = "/settings/domains",
}: {
  baseUrl?: `/${string}`;
}) {
  const { slug } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="-mt-4 border-b border-neutral-200">
      <TabSelect
        options={[
          {
            id: "",
            label: "Custom domains",
            href: `/${slug}${baseUrl}`,
          },
          {
            id: "default",
            label: "Default domains",
            href: `/${slug}${baseUrl}/default`,
          },
        ]}
        selected={page}
      />
    </div>
  );
}
