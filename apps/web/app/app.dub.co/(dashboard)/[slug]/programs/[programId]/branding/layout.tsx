import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren } from "react";
import { ProgramBrandingHeader } from "./program-branding-header";

export default function ProgramSettingsLayout({
  children,
  params,
}: PropsWithChildren<{ params: { slug: string; programId: string } }>) {
  return (
    <PageContent title="Branding">
      <MaxWidthWrapper>
        <ProgramBrandingHeader
          slug={params.slug}
          programId={params.programId}
        />
        <div className="mb-10 mt-6 grid grid-cols-1 gap-8">{children}</div>
      </MaxWidthWrapper>
    </PageContent>
  );
}
