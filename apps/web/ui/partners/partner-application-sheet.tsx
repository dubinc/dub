import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import {
  Button,
  ChevronLeft,
  ChevronRight,
  Msgs,
  Sheet,
  useKeyboardShortcut,
  useRouterStuff,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ProgramApplication } from "@prisma/client";
import Linkify from "linkify-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";
import { PartnerAbout } from "./partner-about";
import { PartnerApplicationTabs } from "./partner-application-tabs";
import { PartnerComments } from "./partner-comments";
import { PartnerInfoCards } from "./partner-info-cards";

type PartnerApplicationSheetProps = {
  partner: EnrolledPartnerProps;
  onNext?: () => void;
  onPrevious?: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerApplicationSheetContent({
  partner,
  onPrevious,
  onNext,
  setIsOpen,
}: PartnerApplicationSheetProps) {
  const { slug: workspaceSlug } = useWorkspace();
  const [currentTabId, setCurrentTabId] = useState<string>("about");

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    partner.groupId ?? null,
  );

  return (
    <div className="flex size-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="text-lg font-semibold">
          Partner application
        </Sheet.Title>
        <div className="flex items-center gap-4">
          <Link
            href={`/${workspaceSlug}/program/messages/${partner.id}`}
            target="_blank"
          >
            <Button
              variant="secondary"
              text="Message"
              icon={<Msgs className="size-4 shrink-0" />}
              className="hidden h-9 rounded-lg px-4 sm:flex"
            />
          </Link>
          <div className="flex items-center">
            <Button
              type="button"
              disabled={!onPrevious}
              onClick={onPrevious}
              variant="secondary"
              className="size-9 rounded-l-lg rounded-r-none p-0"
              icon={<ChevronLeft className="size-3.5" />}
            />
            <Button
              type="button"
              disabled={!onNext}
              onClick={onNext}
              variant="secondary"
              className="-ml-px size-9 rounded-l-none rounded-r-lg p-0"
              icon={<ChevronRight className="size-3.5" />}
            />
          </div>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <div className="@3xl/sheet:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] scrollbar-hide grid min-h-0 grow grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto p-4 sm:p-6">
        <div className="@3xl/sheet:order-2">
          <PartnerInfoCards
            partner={partner}
            {...(partner.status === "rejected" && {
              selectedGroupId,
              setSelectedGroupId,
            })}
          />
        </div>
        <div className="@3xl/sheet:order-1">
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <PartnerApplicationTabs
              partnerId={partner.id}
              currentTabId={currentTabId}
              setCurrentTabId={setCurrentTabId}
            />
            <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
              {currentTabId === "about" && (
                <PartnerApplicationAbout partner={partner} />
              )}
              {currentTabId === "comments" && (
                <PartnerApplicationComments partnerId={partner.id} />
              )}
            </div>
          </div>
        </div>
      </div>

      {["pending", "rejected"].includes(partner.status) && (
        <div className="shrink-0 border-t border-neutral-200 p-5">
          <PartnerApproval
            partner={partner}
            groupId={
              partner.status === "rejected" ? selectedGroupId : partner.groupId
            }
            setIsOpen={setIsOpen}
            onNext={onNext}
          />
        </div>
      )}
    </div>
  );
}

function PartnerApplicationAbout({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
      {partner.applicationId && (
        <>
          <h3 className="text-content-emphasis text-lg font-semibold">
            Application
          </h3>
          <PartnerApplication applicationId={partner.applicationId} />
          <hr className="border-neutral-200" />
        </>
      )}
      <PartnerAbout partner={partner} />
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
    <div className="grid grid-cols-1 gap-6 text-xs">
      {fields.map((field) => (
        <div key={field.title}>
          <h4 className="text-content-emphasis font-semibold">{field.title}</h4>
          <div className="mt-2">
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
              <div className="h-4 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartnerApplicationComments({ partnerId }: { partnerId: string }) {
  return (
    <div>
      <h3 className="text-content-emphasis text-lg font-semibold">Comments</h3>
      <PartnerComments partnerId={partnerId} />
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
      contentProps={{
        // 540px - 1170px width based on viewport
        className: "md:w-[max(min(calc(100vw-334px),1170px),540px)]",
      }}
    >
      <PartnerApplicationSheetContent {...rest} />
    </Sheet>
  );
}

function PartnerApproval({
  partner,
  groupId,
  setIsOpen,
  onNext,
}: {
  partner: EnrolledPartnerProps;
  groupId?: string | null;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { executeAsync, isPending } = useAction(approvePartnerAction, {
    onSuccess: () => {
      onNext ? onNext() : setIsOpen(false);
      toast.success(`Successfully approved ${partner.email} to your program.`);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to approve partner.");
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Approve Partner",
    description: "Are you sure you want to approve this partner application?",
    confirmText: "Approve",
    confirmShortcut: "a",
    confirmShortcutOptions: { sheet: true, modal: true },
    onConfirm: async () => {
      if (!program || !workspaceId) return;

      await executeAsync({
        workspaceId: workspaceId,
        partnerId: partner.id,
        groupId,
      });
    },
  });

  useKeyboardShortcut("a", () => setShowConfirmModal(true), { sheet: true });

  return (
    <>
      {confirmModal}
      <div className="flex justify-end gap-2">
        {partner.status !== "rejected" && (
          <div className="flex-shrink-0">
            <PartnerRejectButton
              partner={partner}
              setIsOpen={setIsOpen}
              onNext={onNext}
            />
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          text="Approve"
          shortcut="A"
          loading={isPending}
          onClick={() => setShowConfirmModal(true)}
          className="w-fit shrink-0"
        />
      </div>
    </>
  );
}

function PartnerRejectButton({
  partner,
  setIsOpen,
  onNext,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onNext?: () => void;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: rejectPartner, isPending } = useAction(
    rejectPartnerAction,
    {
      onSuccess: () => {
        onNext ? onNext() : setIsOpen(false);
        toast.success(
          `Partner ${partner.email} has been rejected from your program.`,
        );
        mutatePrefix("/api/partners");
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
    confirmShortcut: "r",
    confirmShortcutOptions: { sheet: true, modal: true },
    onConfirm: async () => {
      await rejectPartner({
        workspaceId: workspaceId!,
        partnerId: partner.id,
      });
    },
  });

  useKeyboardShortcut("r", () => setShowConfirmModal(true), { sheet: true });

  return (
    <>
      {confirmModal}
      <Button
        type="button"
        variant="secondary"
        text={isPending ? "" : "Reject"}
        loading={isPending}
        shortcut="R"
        onClick={() => {
          setShowConfirmModal(true);
        }}
        className="px-4"
      />
    </>
  );
}
