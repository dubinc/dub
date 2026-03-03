"use client";

import { ChatInterface } from "./chat-interface";
import { SupportChatContext } from "./types";

export function EmbeddedSupportChat({
  context = "app",
}: {
  context?: SupportChatContext;
}) {
  return (
    <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-4">
        <img
          src="https://assets.dub.co/misc/dub-avatar.svg"
          alt="Dub Support"
          className="size-8 rounded-full"
          draggable={false}
        />
        <div>
          <p className="text-sm font-semibold text-neutral-900">Dub Support</p>
          <p className="text-xs text-neutral-500">
            AI-powered · escalates to human when needed
          </p>
        </div>
      </div>

      <ChatInterface context={context} className="flex-1 px-1" embedded />
    </div>
  );
}
