"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader({
  baseUrl = "/settings/domains",
}: {
  baseUrl?: `/${string}`;
}) {
  const { slug, defaultProgramId } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  const options = [
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
  ];

  // Only show Email domains tab if workspace has a default program
  if (defaultProgramId) {
    options.push({
      id: "email",
      label: "Email domains",
      href: `/${slug}${baseUrl}/email`,
    });
  }

  return (
    <div className="-mt-4 border-b border-neutral-200">
      <TabSelect
        options={options}
        selected={page}
      />
    </div>
  );
}
