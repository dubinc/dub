import { PageContent } from "@/ui/layout/page-content";
import { ComponentProps, PropsWithChildren } from "react";

export function CampaignsPageContent({
  controls,
  children,
}: PropsWithChildren<Pick<ComponentProps<typeof PageContent>, "controls">>) {
  return (
    <PageContent
      title="Email campaigns"
      titleInfo={{
        title:
          "Send marketing and transactional emails to your partners to increase engagement and drive conversions.",
        href: "https://dub.co/help/article/email-campaigns",
      }}
      controls={controls}
    >
      {children}
    </PageContent>
  );
}
