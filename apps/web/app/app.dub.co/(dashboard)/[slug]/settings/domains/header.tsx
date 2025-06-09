"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InfoTooltip, TabSelect, TooltipContent } from "@dub/ui";
import { useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader() {
  const { slug } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-neutral-200">
      <div className="flex items-center gap-x-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Domains
        </h1>
        <InfoTooltip
          content={
            <TooltipContent
              title="Learn more about how to add, configure, and verify custom domains on Dub."
              href="https://dub.co/help/article/how-to-add-custom-domain"
              target="_blank"
              cta="Learn more"
            />
          }
        />
      </div>
      <TabSelect
        variant="accent"
        options={[
          {
            id: "",
            label: "Custom domains",
            href: `/${slug}/settings/domains`,
          },
          {
            id: "default",
            label: "Default domains",
            href: `/${slug}/settings/domains/default`,
          },
        ]}
        selected={page}
      />
    </div>
  );
}
