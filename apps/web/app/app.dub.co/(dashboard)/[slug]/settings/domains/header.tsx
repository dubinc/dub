"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { redirect, useRouter, useSelectedLayoutSegment } from "next/navigation";

export function DomainsHeader() {
  const router = useRouter();
  const { slug, flags } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  if (selectedLayoutSegment === null) {
    redirect(`/${slug}/settings/domains/custom`);
  }

  return (
    <div className="border-b border-neutral-200">
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Domains
      </h1>

      <TabSelect
        variant="accent"
        options={[
          { id: "custom", label: "Custom domains" },
          { id: "email", label: "Email domains" },
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
