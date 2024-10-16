import { Suspense } from "react";
import WorkspaceUtmTemplatesClient from "./page-client";

export default function WorkspaceUtmTemplates() {
  return (
    <Suspense>
      <WorkspaceUtmTemplatesClient />
    </Suspense>
  );
}
