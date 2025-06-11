"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { redirect, useSelectedLayoutSegment } from "next/navigation";

export default function LibraryHeader() {
  const { slug } = useWorkspace();

  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  if (selectedLayoutSegment === null) {
    redirect(`/${slug}/settings/library/folders`);
  }

  return (
    <div className="border-b border-neutral-200">
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Library
      </h1>
      <p className="mb-2 mt-2 text-base text-neutral-600">
        Manage and organize your links with customizable folders, tags, and UTM
        templates.
      </p>
      <TabSelect
        variant="accent"
        options={[
          {
            id: "folders",
            label: "Folders",
            href: `/${slug}/settings/library/folders`,
          },
          { id: "tags", label: "Tags", href: `/${slug}/settings/library/tags` },
          {
            id: "utm",
            label: "UTM Templates",
            href: `/${slug}/settings/library/utm`,
          },
        ]}
        selected={page}
      />
    </div>
  );
}
