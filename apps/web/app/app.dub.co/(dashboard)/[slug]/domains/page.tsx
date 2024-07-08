import { MaxWidthWrapper } from "@dub/ui";
import { Suspense } from "react";
import WorkspaceDomainsClient from "./page-client";

export default function WorkspaceDomains() {
  return (
    <MaxWidthWrapper className="mt-[3.25rem]">
      <Suspense>
        <WorkspaceDomainsClient />
      </Suspense>
    </MaxWidthWrapper>
  );
}
