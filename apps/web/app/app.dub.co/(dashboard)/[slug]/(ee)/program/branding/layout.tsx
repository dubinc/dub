import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PropsWithChildren } from "react";
import { ProgramBrandingTabs } from "./program-branding-tabs";

export default function ProgramSettingsLayout({
  children,
  params,
}: PropsWithChildren<{ params: { slug: string; programId: string } }>) {
  return (
    <PageContent
      title="Branding"
      titleInfo={{
        title:
          "Customize your program's landing page, partner portal, and referral embed to ensure brand consistency.",
        href: "https://dub.co/help/article/program-branding",
      }}
      controls={
        <ProgramBrandingTabs slug={params.slug} programId={params.programId} />
      }
    >
      <PageWidthWrapper>
        <div className="mb-4 grid grid-cols-1 gap-8">{children}</div>
      </PageWidthWrapper>
    </PageContent>
  );
}
