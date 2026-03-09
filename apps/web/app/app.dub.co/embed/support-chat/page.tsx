import { SupportChatBubble } from "@/ui/support/chat-bubble";
import { EmbeddedSupportChat } from "@/ui/support/embedded-chat";
import { SupportChatVariant } from "@/ui/support/types";
import { SupportChatDynamicHeightMessenger } from "./dynamic-height-messenger";

export default async function SupportChatEmbedPage(props: {
  searchParams: Promise<{
    variant?: SupportChatVariant;
  }>;
}) {
  const { variant } = await props.searchParams;

  if (variant === "embedded") {
    return (
      <div className="min-h-[500px] bg-white p-4">
        <EmbeddedSupportChat />
        <SupportChatDynamicHeightMessenger />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <SupportChatBubble />
    </div>
  );
}
