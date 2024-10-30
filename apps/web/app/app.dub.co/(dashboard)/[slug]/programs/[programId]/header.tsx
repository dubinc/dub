"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TabSelect } from "@dub/ui";
import {
  useParams,
  useRouter,
  useSelectedLayoutSegment,
} from "next/navigation";

export function ProgramHeader() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { programId } = useParams();
  const selectedLayoutSegment = useSelectedLayoutSegment();

  const page = selectedLayoutSegment === null ? "" : selectedLayoutSegment;

  return (
    <div className="border-b border-gray-200">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-black">
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
        onSelect={(id) => router.push(`/${slug}/programs/${programId}/${id}`)}
      />
    </div>
  );
}
