import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";

export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageContent
      title="Notifications"
      titleInfo={{
        title:
          "Adjust your notification preferences and choose the updates you want to receive. These settings apply only to your account.",
      }}
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
