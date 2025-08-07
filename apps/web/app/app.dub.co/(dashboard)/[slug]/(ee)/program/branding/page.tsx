import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { PropsWithChildren } from "react";

export default function ProgramBrandingLandingPage({
  children,
}: PropsWithChildren) {
  return (
    <PageContent
      title="Branding"
      titleInfo={{
        title:
          "Customize your program's landing page, partner portal, and referral embed to ensure brand consistency.",
        href: "https://dub.co/help/article/program-branding",
      }}
    >
      <PageWidthWrapper>
        <div className="mb-4 grid gap-10">{children}</div>
      </PageWidthWrapper>
    </PageContent>
  );
}
