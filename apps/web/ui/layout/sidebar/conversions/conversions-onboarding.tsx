"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  STORE_KEYS,
  useWorkspaceStore,
} from "@/lib/workspace/use-workspace-store";
import { X } from "@/ui/shared/icons";
import { Book2Small, useMediaQuery } from "@dub/ui";
import { ConversionOnboardingPopup } from "./conversions-onboarding-popup";

export function ConversionsOnboarding({
  referenceElement,
}: {
  referenceElement: HTMLDivElement | null;
}) {
  const { isMobile } = useMediaQuery();

  const { salesUsage, salesLimit, loading } = useWorkspace({
    swrOpts: { keepPreviousData: true },
  });

  const [
    conversionsOnboarding,
    setConversionsOnboarding,
    { loading: loadingConversionsOnboarding },
  ] = useWorkspaceStore<undefined | "nav-button" | "dismissed">(
    STORE_KEYS.conversionsOnboarding,
  );

  const showConversionsOnboarding =
    !loading &&
    !loadingConversionsOnboarding &&
    conversionsOnboarding !== "dismissed" &&
    salesUsage === 0 &&
    salesLimit &&
    salesLimit > 0;

  if (!showConversionsOnboarding) return null;

  const showPopup = !isMobile && !conversionsOnboarding;

  return showPopup ? (
    <ConversionOnboardingPopup
      referenceElement={referenceElement}
      onCTA={() => {
        alert("open modal");
        setConversionsOnboarding("nav-button");
      }}
      onDismiss={() => setConversionsOnboarding("nav-button")}
    />
  ) : (
    <div className="relative mt-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md bg-neutral-900/5 px-2 py-1.5 text-xs text-neutral-600 transition-colors duration-100 hover:bg-neutral-900/10"
        onClick={() => alert("open modal")}
      >
        <Book2Small className="size-3 text-neutral-800" />
        View setup guides
      </button>
      <div className="absolute right-0 top-0 flex h-full items-center p-1">
        <button
          type="button"
          className="rounded p-1 transition-colors duration-100 hover:bg-neutral-900/5"
          onClick={() => setConversionsOnboarding("dismissed")}
        >
          <X className="size-3 text-neutral-500" />
        </button>
      </div>
    </div>
  );
}
