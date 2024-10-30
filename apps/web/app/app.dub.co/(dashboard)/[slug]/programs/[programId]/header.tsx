"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";

export function ProgramHeader() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const selectedLayoutSegment = useSelectedLayoutSegment();

  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <h1 className="text-2xl font-semibold tracking-tight text-black mb-4">
        Program
      </h1>

      <TabSelect
        variant="accent"
        options={[
          { id: "overview", label: "Overview" },
          { id: "payouts", label: "Payouts" },
          { id: "partners", label: "Partners" },
          { id: "customers", label: "Customers" },
          { id: "designs", label: "Design" },
          { id: "resources", label: "Resources" },
          { id: "settings", label: "Settings" },
        ]}
        selected={page}
        onSelect={(id) => router.push(`/${slug}/programs/111/${id}`)}
      />
    </div>
  );
}
