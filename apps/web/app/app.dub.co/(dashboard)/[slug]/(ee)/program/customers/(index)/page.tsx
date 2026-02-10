"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CustomersTable } from "@/ui/customers/customers-table/customers-table";

export default function ProgramCustomersPage() {
  const { defaultProgramId } = useWorkspace();
  return (
    <CustomersTable
      query={{ programId: defaultProgramId || undefined }}
      isProgramPage
    />
  );
}
