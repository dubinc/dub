import { reopenBountySubmissionAction } from "@/lib/actions/partners/reopen-bounty-submission";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountySubmissionProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { Button, Icon, Popover, useRouterStuff } from "@dub/ui";
import { ArrowsOppositeDirectionX, Dots, Eye } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Row } from "@tanstack/react-table";
import { Command } from "cmdk";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function BountySubmissionRowMenu({
  row,
}: {
  row: Row<BountySubmissionProps>;
}) {
  const { bountyId } = useParams<{ bountyId: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const { queryParams } = useRouterStuff();
  const { id: workspaceId } = useWorkspace();

  const submission = row.original.submission;

  // Only show menu if there's a submission
  if (!submission) {
    return null;
  }

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Reopen submission",
    description: (
      <>
        Are you sure you want to reopen this bounty submission? This will reset
        the submission back to draft status.
      </>
    ),
    confirmText: "Reopen",
    onConfirm: async () => {
      try {
        await reopenBountySubmissionAction({
          workspaceId: workspaceId!,
          submissionId: submission.id,
        });
        await mutatePrefix(`/api/bounties/${bountyId}/submissions`);
        toast.success("Bounty submission reopened successfully");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to reopen bounty submission",
        );
      }
    },
  });

  return (
    <>
      {confirmModal}
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <Command tabIndex={0} loop className="pointer-events-auto">
            <Command.List className="flex w-screen flex-col gap-1 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[180px]">
              <Command.Group className="p-1.5">
                <MenuItem
                  icon={Eye}
                  label="Review submission"
                  onSelect={() => {
                    queryParams({
                      set: {
                        submissionId: submission.id,
                      },
                      scroll: false,
                    });
                    setIsOpen(false);
                  }}
                />

                {submission.status === "submitted" && (
                  <MenuItem
                    icon={ArrowsOppositeDirectionX}
                    label="Reopen submission"
                    onSelect={() => {
                      setShowConfirmModal(true);
                      setIsOpen(false);
                    }}
                  />
                )}
              </Command.Group>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="h-8 whitespace-nowrap px-2"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </>
  );
}

function MenuItem({
  icon: IconComp,
  label,
  onSelect,
  disabled,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-md p-2 text-sm text-neutral-600",
        "data-[selected=true]:bg-neutral-100",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onSelect={onSelect}
      disabled={disabled}
    >
      <IconComp className="size-4 shrink-0 text-neutral-500" />
      {label}
    </Command.Item>
  );
}
