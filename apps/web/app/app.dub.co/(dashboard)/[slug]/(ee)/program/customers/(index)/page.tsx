"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerTable } from "@/ui/customers/customer-table/customer-table";

export default function ProgramCustomersPage() {
  const { defaultProgramId } = useWorkspace();
  return (
    <CustomerTable
      query={{ programId: defaultProgramId || undefined }}
      isProgramPage
    />
  );
}
