"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import { Button, MaxWidthWrapper } from "@dub/ui";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { CursorRays } from "../layout/sidebar/icons/cursor-rays";
import { AnimatedEmptyState } from "../shared/animated-empty-state";

export default function WorkspaceExceededEvents() {
  const { slug, trialEndsAt } = useWorkspace();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  return (
    <MaxWidthWrapper>
      <TrialLimitActivateModal />
      <div className="my-10 flex flex-col items-center justify-center py-12">
        <AnimatedEmptyState
          title="Stats Locked"
          description="Your workspace has exceeded your monthly events limit. We're still collecting data on your links, but you need to upgrade to view them."
          cardContent={() => (
            <>
              <CursorRays className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
            </>
          )}
          className="border-none"
          learnMoreText={trialActive ? undefined : "Upgrade plan"}
          learnMoreHref={trialActive ? undefined : `/${slug}/settings/billing`}
          learnMoreTarget="_self"
          addButton={
            trialActive ? (
              <Button
                variant="primary"
                text="Start paid plan"
                className="h-9"
                onClick={() => openTrialLimitModal("clicks")}
              />
            ) : undefined
          }
        />
      </div>
    </MaxWidthWrapper>
  );
}
