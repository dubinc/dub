"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

export default function LibraryHeader() {
  const router = useRouter();
  const { slug } = useWorkspace();

  const selectedLayoutSegment = useSelectedLayoutSegment();
  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        Library
      </h1>
      <p className="mb-2 mt-2 text-base text-neutral-600">
        Manage and organize your links with customizable tags and UTM templates.
      </p>
      <TabSelect
        variant="accent"
        options={[
          { id: "tags", label: "Tags" },
          { id: "utm", label: "UTM Templates" },
        ]}
        selected={page}
        onSelect={(id) => {
          router.push(`/${slug}/settings/library/${id}`);
        }}
      />
    </div>
  );
}
