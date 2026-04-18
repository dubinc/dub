"use client";

import usePartnersCount from "@/lib/swr/use-partners-count";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { OG_AVATAR_URL, pluralize } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { Markdown } from "../shared/markdown";

export type PlanChangeConfirmationMode =
  | "program-downgrade"
  | "advanced-downgrade";

function PlanChangeConfirmationModal({
  showPlanChangeConfirmationModal,
  setShowPlanChangeConfirmationModal,
  confirmationMode,
  onConfirm,
}: {
  showPlanChangeConfirmationModal: boolean;
  setShowPlanChangeConfirmationModal: Dispatch<SetStateAction<boolean>>;
  confirmationMode: PlanChangeConfirmationMode;
  onConfirm: () => void | Promise<void>;
}) {
  const {
    slug,
    name: workspaceName,
    logo: workspaceLogo,
    defaultProgramId,
  } = useWorkspace();

  const { program } = useProgram({
    enabled: showPlanChangeConfirmationModal,
  });

  const { partnersCount, loading: partnersCountLoading } =
    usePartnersCount<number>({
      ignoreParams: true,
      enabled: showPlanChangeConfirmationModal,
    });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = program?.name ?? workspaceName ?? "";
  const logoSrc =
    program?.logo ??
    workspaceLogo ??
    (displayName
      ? `${OG_AVATAR_URL}${displayName}`
      : `${OG_AVATAR_URL}default`);

  const PROGRAM_DOWNGRADE_MARKDOWN = [
    "- You will lose access to your partner program.",
    "- Your partner program will be deactivated and partners will be notified automatically.",
    "- Partner links will stop tracking new activity.",
    `- Any [pending payouts](https://app.dub.co/${slug}/program/payouts?status=pending) must be communicated and settled directly with your partners.`,
  ].join("\n");

  const ADVANCED_DOWNGRADE_MARKDOWN = [
    "- [Email campaigns](https://dub.co/help/article/email-campaigns) will be paused or canceled.",
    "- [Messaging center](https://dub.co/help/article/messaging-partners) will be disabled.",
    "- [Advanced reward conditions](https://dub.co/help/article/partner-rewards) will be removed.",
    "- [Fraud events](https://dub.co/help/article/fraud-detection) will still be tracked, but you need to upgrade to view them.",
    "- If you've set up the [Embedded Referral Dashboard](https://dub.co/docs/partners/embedded-referrals), it will no longer work.",
  ].join("\n");

  return (
    <Modal
      showModal={showPlanChangeConfirmationModal}
      setShowModal={setShowPlanChangeConfirmationModal}
      className="max-w-md"
    >
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-lg font-medium">Plan change confirmation</h3>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        <div className="flex flex-col gap-1 rounded-lg bg-amber-100 p-1">
          <div className="flex items-center gap-2 p-2">
            <TriangleWarning className="size-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-900">
              {confirmationMode === "advanced-downgrade"
                ? "You will lose Advanced plan features"
                : "This change will affect your partner program"}
            </p>
          </div>

          {defaultProgramId && displayName ? (
            <div className="w-full rounded-lg border border-amber-100 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt={displayName}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-800">
                    {displayName}
                  </p>
                  {!partnersCountLoading && partnersCount !== undefined ? (
                    <p className="text-sm text-neutral-500">
                      {partnersCount} {pluralize("partner", partnersCount)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <Markdown className="list-decimal">
          {confirmationMode === "advanced-downgrade"
            ? ADVANCED_DOWNGRADE_MARKDOWN
            : PROGRAM_DOWNGRADE_MARKDOWN}
        </Markdown>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-5 sm:px-6">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={() => setShowPlanChangeConfirmationModal(false)}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="Continue"
          loading={isSubmitting}
          disabled={isSubmitting}
          onClick={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            await onConfirm();
          }}
        />
      </div>
    </Modal>
  );
}

export function usePlanChangeConfirmationModal({
  onConfirm,
  confirmationMode = "program-downgrade",
}: {
  onConfirm: () => void | Promise<void>;
  confirmationMode?: PlanChangeConfirmationMode;
}) {
  const [showPlanChangeConfirmationModal, setShowPlanChangeConfirmationModal] =
    useState(false);

  // Use ref to avoid re-renders when parent state changes
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const confirmationModeRef = useRef(confirmationMode);
  confirmationModeRef.current = confirmationMode;

  const PlanChangeConfirmationModalCallback = useCallback(() => {
    return (
      <PlanChangeConfirmationModal
        showPlanChangeConfirmationModal={showPlanChangeConfirmationModal}
        setShowPlanChangeConfirmationModal={setShowPlanChangeConfirmationModal}
        confirmationMode={confirmationModeRef.current}
        onConfirm={() => onConfirmRef.current()}
      />
    );
  }, [showPlanChangeConfirmationModal]);

  return useMemo(
    () => ({
      setShowPlanChangeConfirmationModal,
      PlanChangeConfirmationModal: PlanChangeConfirmationModalCallback,
    }),
    [setShowPlanChangeConfirmationModal, PlanChangeConfirmationModalCallback],
  );
}
