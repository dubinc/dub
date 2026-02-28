import {
  SupportChatContext,
  SupportChatVariant,
  parseSupportChatContext,
  parseSupportChatVariant,
} from "@/ui/support/types";
import { SupportChatBubble } from "@/ui/support/chat-bubble";
import { EmbeddedSupportChat } from "@/ui/support/embedded-chat";
import { SupportChatDynamicHeightMessenger } from "./dynamic-height-messenger";

export default async function SupportChatEmbedPage(props: {
  searchParams: Promise<{
    variant?: SupportChatVariant;
    context?: SupportChatContext;
    external?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const variant = parseSupportChatVariant(searchParams.variant);
  const context = parseSupportChatContext(searchParams.context);

  // external=true: bubble button lives in the parent page, panel auto-opens
  const externalTrigger = searchParams.external === "true";

  if (variant === "embedded") {
    return (
      <div className="min-h-[500px] bg-white p-4">
        <EmbeddedSupportChat context={context} />
        <SupportChatDynamicHeightMessenger />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <SupportChatBubble context={context} externalTrigger={externalTrigger} />
    </div>
  );
}
