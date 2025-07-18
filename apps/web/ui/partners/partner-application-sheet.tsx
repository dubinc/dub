import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { X } from "@/ui/shared/icons";
import { Button, Sheet, useRouterStuff } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { ProgramApplication } from "@prisma/client";
import Linkify from "linkify-react";
import { ChevronLeft } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";
import { OnlinePresenceSummary } from "./online-presence-summary";
import { PartnerInfoSection } from "./partner-info-section";
import { PartnerLinkSelector } from "./partner-link-selector";

type PartnerApplicationSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

function PartnerApplicationSheetContent({
  partner,
  setIsOpen,
}: PartnerApplicationSheetProps) {
  return (
    <>
      <div className="flex grow flex-col">
        <div className="flex h-16 items-center justify-between px-6 py-4">
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
        <div className="border-y border-neutral-200 bg-neutral-50 p-6">
          {/* Basic info */}
          <PartnerInfoSection partner={partner} />
        </div>
        <div className="p-6 text-sm text-neutral-600">
          <PendingPartnerSummary partner={partner} />
        </div>

        {partner.status === "pending" && (
          <div className="flex grow flex-col justify-end">
            <div className="border-t border-neutral-200 p-5">
              <PartnerApproval partner={partner} setIsOpen={setIsOpen} />
            </div>
          </div>
        )}
      </div>
    </>
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

  const [isApproving, setIsApproving] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    if (selectedLinkId) setLinkError(false);
  }, [selectedLinkId]);

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

  const createLink = async (search: string) => {
    if (!search) throw new Error("No link entered");

    const shortKey = search.startsWith(program?.domain + "/")
      ? search.substring((program?.domain + "/").length)
      : search;

    const response = await fetch(`/api/links?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: program?.domain,
        key: shortKey,
        url: program?.url,
        trackConversion: true,
        programId: program?.id,
        folderId: program?.defaultFolderId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const { error } = result;
      throw new Error(error.message);
    }

    setSelectedLinkId(result.id);

    return result.id;
  };

  return (
    <div className="flex">
      <div
        className={cn(
          "transition-[width] duration-300",
          isApproving ? "w-[52px]" : "w-[83px]",
        )}
      >
        {isApproving ? (
          <Button
            type="button"
            variant="secondary"
            icon={<ChevronLeft className="size-4 shrink-0" />}
            onClick={() => {
              setIsApproving(false);
              setSelectedLinkId(null);
            }}
          />
        ) : (
          <PartnerRejectButton partner={partner} setIsOpen={setIsOpen} />
        )}
      </div>

      <div className="flex grow pl-2">
        <div
          className={cn(
            "w-0 transition-[width] duration-300",
            isApproving && "w-full",
          )}
        >
          <div className="w-[calc(100%-8px)]">
            <PartnerLinkSelector
              selectedLinkId={selectedLinkId}
              setSelectedLinkId={setSelectedLinkId}
              showDestinationUrl={false}
              onCreate={async (search) => {
                try {
                  await createLink(search);
                  return true;
                } catch (error) {
                  toast.error(error?.message ?? "Failed to create link");
                }
                return false;
              }}
              error={linkError}
              optional
            />
          </div>
        </div>

        <div className="grow">
          <Button
            type="button"
            variant="primary"
            text="Approve"
            loading={isPending}
            onClick={async () => {
              if (!program || !workspaceId) {
                return;
              }

              if (!isApproving) {
                setIsApproving(true);
                setLinkError(false);
                return;
              }

              // Approve partner
              await executeAsync({
                workspaceId: workspaceId!,
                partnerId: partner.id,
                linkId: selectedLinkId,
              });
            }}
          />
        </div>
      </div>
    </div>
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
          "Application rejected. No email sent, and can they reapply in 30 days.",
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
