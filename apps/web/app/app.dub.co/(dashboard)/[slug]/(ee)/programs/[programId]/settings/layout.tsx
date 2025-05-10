import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren } from "react";
import { ProgramSettingsHeader } from "./program-settings-header";

export default function ProgramSettingsLayout({
  children,
  params,
}: PropsWithChildren<{ params: { slug: string; programId: string } }>) {
  return (
    <PageContent title="Program Configuration">
      <MaxWidthWrapper>
        <ProgramSettingsHeader
          slug={params.slug}
          programId={params.programId}
        />
        <div className="mb-10 mt-8 grid grid-cols-1 gap-8">{children}</div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
