import { Suspense } from "react";
import WorkspaceInvoicesClient from "./page-client";

export default function WorkspaceInvoices() {
  return (
    <Suspense>
      <WorkspaceInvoicesClient />
    </Suspense>
  );
}
