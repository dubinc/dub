"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { ChatInterface } from "./chat-interface";
import { ClearChatButton } from "./clear-chat-button";

export function EmbeddedSupportChat() {
  const { data: session } = useSession();
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => {
    if (session?.user?.["id"]) {
      try {
        localStorage.removeItem(`dub-support-chat:${session.user["id"]}`);
      } catch {}
    }
    setResetKey((k) => k + 1);
  };

  return (
    <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src="https://assets.dub.co/misc/dub-avatar.svg"
            alt="Dub Support"
            className="size-8 rounded-full"
            draggable={false}
          />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Dub Support
            </p>
            <p className="text-xs text-neutral-500">
              AI-powered · escalates to human when needed
            </p>
          </div>
        </div>

        <ClearChatButton
          onConfirm={handleReset}
          triggerClassName="size-8 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          iconClassName="size-4"
        />
      </div>

      <ChatInterface
        key={resetKey}
        onReset={handleReset}
        className="flex-1 px-1"
        embedded
      />
    </div>
  );
}
