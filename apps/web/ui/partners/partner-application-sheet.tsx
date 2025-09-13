import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ProgramApplication } from "@prisma/client";
import Linkify from "linkify-react";

import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";
import { GroupSelector } from "./groups/group-selector";
import { OnlinePresenceSummary } from "./online-presence-summary";
import { PartnerInfoSection } from "./partner-info-section";

type PartnerApplicationSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerApplicationSheetContent({
  partner,
  setIsOpen,
}: PartnerApplicationSheetProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner application
        </Sheet.Title>
        <div className="flex items-center gap-2">
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-neutral-200 bg-neutral-50 p-6">
          {/* Basic info */}
          <PartnerInfoSection partner={partner} />
        </div>
        <div className="p-6 text-sm text-neutral-600">
          <PendingPartnerSummary partner={partner} />
        </div>
      </div>

      {partner.status === "pending" && (
        <div className="border-t border-neutral-200 p-5">
          <PartnerApproval partner={partner} setIsOpen={setIsOpen} />
        </div>
      )}
    </div>
  );
}

function PendingPartnerSummary({ partner }: { partner: EnrolledPartnerProps }) {
  return (
    <div className="grid grid-cols-1 gap-6 text-sm text-neutral-600">
      <div>
        <h4 className="text-content-emphasis font-semibold">Description</h4>
        <p className="mt-1">
          {partner.description || (
            <span className="text-content-muted italic">
              No description provided
            </span>
          )}
        </p>
      </div>
      <hr className="border-neutral-200" />
      {partner.applicationId && (
        <>
          <PartnerApplication applicationId={partner.applicationId} />
          <hr className="border-neutral-200" />
        </>
      )}
      <div>
        <h4 className="text-content-emphasis font-semibold">Online presence</h4>
        <OnlinePresenceSummary partner={partner} className="mt-3" />
      </div>
    </div>
  );
}

function PartnerApplication({ applicationId }: { applicationId: string }) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { data: application } = useSWRImmutable<ProgramApplication>(
    program &&
      workspaceId &&
      `/api/programs/${program.id}/applications/${applicationId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const fields = [
    {
      title: `How do you plan to promote ${program?.name}?`,
      value: application?.proposal,
    },
    {
      title: "Any additional questions or comments?",
      value: application?.comments,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 text-sm">
      {fields.map((field) => (
        <div key={field.title}>
          <h4 className="text-content-emphasis font-semibold">{field.title}</h4>
          <div className="mt-1">
            {field.value || field.value === "" ? (
              <Linkify
                as="p"
                options={{
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                  className:
                    "underline underline-offset-4 text-neutral-400 hover:text-neutral-700",
                }}
              >
                {field.value || (
                  <span className="text-content-muted italic">
                    No response provided
                  </span>
                )}
              </Linkify>
            ) : (
              <div className="h-5 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PartnerApplicationSheet({
  isOpen,
  nested,
  ...rest
}: PartnerApplicationSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
      nested={nested}
    >
      <PartnerApplicationSheetContent {...rest} />
    </Sheet>
  );
}

function PartnerApproval({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    partner.groupId ?? program?.defaultGroupId ?? null,
  );
  const { executeAsync, isPending } = useAction(approvePartnerAction, {
    onSuccess: async () => {
      await mutatePrefix("/api/partners");
      queryParams({ del: "partnerId" });
      setIsOpen(false);
      toast.success("Approved the partner successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to approve partner.");
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Approve Partner",
    description: "Are you sure you want to approve this partner application?",
    confirmText: "Approve",
    onConfirm: async () => {
      if (!program || !workspaceId || !selectedGroupId) {
        return;
      }

      await executeAsync({
        workspaceId: workspaceId,
        partnerId: partner.id,
        groupId: selectedGroupId,
      });
    },
  });

  return (
    <>
      {confirmModal}
      <div className="flex flex-col gap-3">
        <GroupSelector
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
        />
        <div className="flex gap-2">
          <div className="flex-shrink-0">
            <PartnerRejectButton partner={partner} setIsOpen={setIsOpen} />
          </div>
          <Button
            type="button"
            variant="primary"
            text="Approve"
            loading={isPending}
            disabled={!selectedGroupId}
            onClick={() => setShowConfirmModal(true)}
            className="flex-1"
          />
        </div>
      </div>
    </>
  );
}

function PartnerRejectButton({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: rejectPartner, isPending } = useAction(
    rejectPartnerAction,
    {
      onSuccess: async () => {
        await mutatePrefix("/api/partners");
        toast.success(
          "Application rejected. No email sent, and they can reapply in 30 days.",
        );
        setIsOpen(false);
      },
      onError({ error }) {
        toast.error(error.serverError || "Failed to reject partner.");
      },
    },
  );

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Reject Application",
    description: "Are you sure you want to reject this partner application?",
    confirmText: "Reject",
    onConfirm: async () => {
      await rejectPartner({
        workspaceId: workspaceId!,
        partnerId: partner.id,
      });
    },
  });

  return (
    <>
      {confirmModal}
      <Button
        type="button"
        variant="secondary"
        text={isPending ? "" : "Reject"}
        loading={isPending}
        onClick={() => {
          setShowConfirmModal(true);
        }}
        className="px-4"
      />
    </>
  );
}

export function usePartnerApplicationSheet(
  props: { nested?: boolean } & Omit<PartnerApplicationSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    partnerApplicationSheet: (
      <PartnerApplicationSheet
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
