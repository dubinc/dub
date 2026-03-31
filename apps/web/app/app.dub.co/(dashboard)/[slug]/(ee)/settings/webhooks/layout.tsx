import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { ReactNode } from "react";
import CreateWebhookButton from "./create-webhook-button";

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <PageContent
      title="Webhooks"
      titleInfo={{
        title:
          "Webhooks allow you to receive HTTP requests whenever a specific event (eg: someone clicked your link) occurs in Dub.",
        href: "https://d.to/webhooks",
      }}
      controls={<CreateWebhookButton />}
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}
