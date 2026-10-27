"use client";

import useProgram from "@/lib/swr/use-program";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { ChevronLeft, Msgs } from "@dub/ui/icons";
import { MessagesDisabled } from "./messages-disabled";

export function ProgramMessagesPageClient() {
  const { program } = useProgram();
  const { setCurrentPanel } = useMessagesContext();

  return program?.messagingEnabledAt === null ? (
    <MessagesDisabled />
  ) : (
    <div className="flex h-full flex-col">
      <div className="border-border-subtle flex h-12 items-center gap-2 border-b px-4 sm:h-16 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setCurrentPanel("index");
          }}
          className="@[800px]/page:hidden rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      <div className="flex grow flex-col items-center justify-center gap-4">
        <Msgs className="text-content-muted size-10" />
        <p className="text-content-muted text-sm font-medium">
          Select or compose a message
        </p>
      </div>
    </div>
  );
}
