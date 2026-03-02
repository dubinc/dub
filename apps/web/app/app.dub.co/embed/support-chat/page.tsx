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
  }>;
}) {
  const searchParams = await props.searchParams;
  const variantParam = Array.isArray(searchParams.variant)
    ? searchParams.variant[0]
    : searchParams.variant;
  const contextParam = Array.isArray(searchParams.context)
    ? searchParams.context[0]
    : searchParams.context;
  const variant = parseSupportChatVariant(variantParam);
  const context = parseSupportChatContext(contextParam);

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
      <SupportChatBubble context={context} />
    </div>
  );
}
