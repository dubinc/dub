import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";
import { ApplicationSettingsButton } from "./applications-menu-popover";
import { ApplicationsShell } from "./applications-shell";

export default function ProgramPartnersApplicationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageContent
      title="Applications"
      titleInfo={{
        title:
          "Learn how to review and [manage your program applications](https://dub.co/help/article/program-applications) and bring the best partners to your program.",
      }}
      controls={<ApplicationSettingsButton />}
    >
      <PageWidthWrapper>
        <ApplicationsShell>{children}</ApplicationsShell>
      </PageWidthWrapper>
    </PageContent>
  );
}
