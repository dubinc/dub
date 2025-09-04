"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useMessagesContext } from "@/ui/messages/messages-context";
import { useRouterStuff } from "@dub/ui";
import { ChevronLeft, Msgs } from "@dub/ui/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PartnerMessagesPageClient() {
  const { slug: workspaceSlug } = useWorkspace();
  const { setCurrentPanel } = useMessagesContext();

  const router = useRouter();
  const { searchParams, queryParams } = useRouterStuff();

  // Short-lived state to display the selected program while the next page loads
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-border-subtle flex h-12 items-center gap-2 border-b px-4 sm:h-16 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setCurrentPanel("index");
            queryParams({ del: "new" });
          }}
          className="@[800px]/page:hidden rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {searchParams.get("new") && (
          <div className="animate-slide-up-fade flex items-center gap-3 [--offset:10px] [animation-duration:1s]">
            <span className="text-content-subtle text-lg font-medium">To</span>
            <div className="min-w-24 sm:w-64">
              {/* TODO: [Messages] Add program selector */}
              [Program Selector]
              {/* <PartnerSelector
                selectedPartnerId={selectedPartnerId}
                setSelectedPartnerId={(id) => {
                  setSelectedPartnerId(id);
                  router.push(`/${workspaceSlug}/program/messages/${id}`);
                }}
              /> */}
            </div>
          </div>
        )}
      </div>

      <div className="flex grow flex-col items-center justify-center gap-4">
        <Msgs className="text-content-muted size-10" />
        <p className="text-content-muted text-sm font-medium">
          {searchParams.get("new")
            ? "Select a program to message"
            : "Select or compose a message"}
        </p>
      </div>
    </div>
  );
}
