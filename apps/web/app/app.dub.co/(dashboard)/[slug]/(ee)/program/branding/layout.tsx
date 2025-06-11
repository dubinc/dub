import { PageContentOld } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { PropsWithChildren } from "react";
import { ProgramBrandingTabs } from "./program-branding-tabs";

export default function ProgramSettingsLayout({
  children,
  params,
}: PropsWithChildren<{ params: { slug: string; programId: string } }>) {
  return (
    <PageContentOld
      title="Branding"
      titleControls={
        <ProgramBrandingTabs slug={params.slug} programId={params.programId} />
      }
    >
      <MaxWidthWrapper>
        <div className="mb-4 grid grid-cols-1 gap-8 pt-3">{children}</div>
      </MaxWidthWrapper>
    </PageContentOld>
  );
}
