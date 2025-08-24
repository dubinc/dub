import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyExtendedProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { Button, MenuItem, Popover, useRouterStuff } from "@dub/ui";
import { Calendar6, Dots, PenWriting, Trash, Users } from "@dub/ui/icons";
import { formatDate, pluralize } from "@dub/utils";
import { Command } from "cmdk";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function BountyCard({ bounty }: { bounty: BountyExtendedProps }) {
  const { queryParams } = useRouterStuff();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { confirmModal: deleteModal, setShowConfirmModal: setShowDeleteModal } =
    useConfirmModal({
      title: "Delete bounty",
      description: "Are you sure you want to delete this bounty?",
      onConfirm: async () => {
        toast.promise(
          async () => {
            const response = await fetch(
              `/api/bounties/${bounty.id}?workspaceId=${workspaceId}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );

            if (!response.ok) throw new Error("Failed to delete bounty");

            await mutatePrefix("/api/bounties");
          },
          {
            loading: "Deleting bounty...",
            success: "Bounty deleted successfully!",
            error: (err) => err,
          },
        );
      },
    });

  return (
    <div className="border-border-subtle hover:border-border-default relative cursor-pointer rounded-xl border bg-white p-5 transition-all hover:shadow-lg">
      {deleteModal}

      <Link
        href={`/${workspaceSlug}/program/bounties/${bounty.id}`}
        className="flex flex-col gap-5"
      >
        <div className="relative flex h-[132px] items-center justify-center rounded-lg bg-neutral-100 py-1.5">
          <div className="relative size-full">
            <BountyThumbnailImage bounty={bounty} />
          </div>

          <PendingSubmissionsBadge count={bounty.submissionsCount} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-content-emphasis truncate text-sm font-semibold">
            {bounty.name}
          </h3>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Calendar6 className="size-3.5" />
            <span>
              {formatDate(bounty.startsAt, { month: "short" })}
              {bounty.endsAt && (
                <>
                  {" → "}
                  {formatDate(bounty.endsAt, { month: "short" })}
                </>
              )}
            </span>
          </div>

          <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
            <Users className="size-3.5" />
            <div className="h-5">
              <span className="text-content-default">
                {bounty.submissionsCount}
              </span>{" "}
              of{" "}
              <span className="text-content-default">
                {bounty.partnersCount}
              </span>{" "}
              partners completed
            </div>
          </div>
        </div>
      </Link>

      <Popover
        openPopover={isMenuOpen}
        setOpenPopover={setIsMenuOpen}
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[200px]">
              <MenuItem
                as={Command.Item}
                icon={PenWriting}
                variant="default"
                onSelect={() => {
                  queryParams({ set: { bountyId: bounty.id } });
                  setIsMenuOpen(false);
                }}
              >
                Edit bounty
              </MenuItem>
              <MenuItem
                as={Command.Item}
                icon={Trash}
                variant="danger"
                onSelect={() => {
                  setIsMenuOpen(false);
                  setShowDeleteModal(true);
                }}
              >
                Delete bounty
              </MenuItem>
            </Command.List>
          </Command>
        }
        align="end"
      >
        <Button
          type="button"
          className="absolute right-7 top-7 size-7 whitespace-nowrap p-0 hover:bg-neutral-200 active:bg-neutral-300 data-[state=open]:bg-neutral-300"
          variant="outline"
          icon={<Dots className="h-4 w-4 shrink-0" />}
        />
      </Popover>
    </div>
  );
}

const PendingSubmissionsBadge = ({ count }: { count: number }) => {
  return (
    <div className="absolute left-2 top-2 z-10">
      <div className="flex h-5 items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
        {count} {pluralize("submission", count)} for review
      </div>
    </div>
  );
};

export const BountyCardSkeleton = () => {
  return (
    <div className="border-border-subtle rounded-xl border bg-white p-5">
      <div className="flex flex-col gap-5">
        <div className="flex h-[132px] animate-pulse items-center justify-center rounded-lg bg-neutral-100 px-32 py-4" />

        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-48 animate-pulse rounded-md bg-neutral-200" />

          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
          </div>

          <div className="flex h-5 items-center space-x-2">
            <div className="size-4 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
