"use client";

import { Tooltip } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { useState } from "react";
import { ChatInterface } from "./chat-interface";

export function EmbeddedSupportChat() {
  const [resetKey, setResetKey] = useState(0);
  const handleReset = () => setResetKey((k) => k + 1);

  return (
    <div className="flex min-h-[500px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
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

        <Tooltip content="Clear chat">
          <button
            type="button"
            onClick={handleReset}
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Clear chat"
          >
            <Trash className="size-4" />
          </button>
        </Tooltip>
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
