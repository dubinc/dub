"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InfoTooltip, TabSelect, TooltipContent } from "@dub/ui";
import { redirect, useRouter, useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader() {
  const router = useRouter();
  const { slug, partnersEnabled } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  if (selectedLayoutSegment === null) {
    redirect(`/${slug}/settings/domains/custom`);
  }

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
          { id: "custom", label: "Custom domains" },
          // ...(partnersEnabled ? [{ id: "email", label: "Email domains" }] : []),
          { id: "default", label: "Default domains" },
        ]}
        selected={page}
        onSelect={(id: string) => {
          router.push(`/${slug}/settings/domains/${id}`);
        }}
      />
    </div>
  );
}
