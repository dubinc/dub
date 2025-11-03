"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import usePartnerGroupDefaultLinks from "@/lib/swr/use-partner-group-default-links";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerGroupDefaultLink } from "@/lib/types";
import { MAX_DEFAULT_LINKS_PER_GROUP } from "@/lib/zod/schemas/groups";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  Hyperlink,
  InfoTooltip,
  Popover,
  SimpleTooltipContent,
} from "@dub/ui";
import { PenWriting, Trash } from "@dub/ui/icons";
import { cn, getPrettyUrl, getUrlWithoutUTMParams } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDefaultPartnerLinkSheet } from "./add-edit-group-default-link-sheet";
import { PartnerLinkPreview } from "./partner-link-preview";

export function GroupDefaultLinks() {
  const { defaultLinks, loading: loadingDefaultLinks } =
    usePartnerGroupDefaultLinks();

  const hasReachedMaxLinks = defaultLinks
    ? defaultLinks.length >= MAX_DEFAULT_LINKS_PER_GROUP
    : false;

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-content-emphasis text-lg font-semibold leading-7">
              Default links
            </h3>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Default links are links that are automatically created for each partner in this group."
                  cta="Learn more."
                  href="https://dub.co/help/article/partner-link-settings#default-referral-links"
                />
              }
            />
          </div>
          <p className="text-content-subtle text-sm font-normal leading-5">
            Links that are automatically created for each partner in this group
          </p>
        </div>

        <CreateDefaultLinkButton
          hasReachedMaxLinks={hasReachedMaxLinks}
          isLoadingGroup={loadingDefaultLinks}
        />
      </div>

      {defaultLinks && defaultLinks.length > 0 ? (
        <div className="flex flex-col gap-4">
          {defaultLinks.map((link) => (
            <DefaultLinkPreview key={link.url} link={link} />
          ))}
        </div>
      ) : loadingDefaultLinks ? (
        <div className="flex flex-col gap-4">
          <DefaultLinkPreviewSkeleton />
          <DefaultLinkPreviewSkeleton />
        </div>
      ) : (
        <NoDefaultLinks />
      )}
    </div>
  );
}

function CreateDefaultLinkButton({
  hasReachedMaxLinks,
  isLoadingGroup,
}: {
  hasReachedMaxLinks: boolean;
  isLoadingGroup: boolean;
}) {
  const { DefaultPartnerLinkSheet, setIsOpen } = useDefaultPartnerLinkSheet({});

  return (
    <>
      <Button
        text="Create link"
        variant="primary"
        className="h-8 w-fit rounded-lg px-3"
        onClick={() => setIsOpen(true)}
        disabled={hasReachedMaxLinks || isLoadingGroup}
        disabledTooltip={
          hasReachedMaxLinks
            ? `You can only create up to ${MAX_DEFAULT_LINKS_PER_GROUP} default links.`
            : undefined
        }
      />
      {DefaultPartnerLinkSheet}
    </>
  );
}

function DefaultLinkPreview({ link }: { link: PartnerGroupDefaultLink }) {
  const { group } = useGroup();
  const { id: workspaceId } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { makeRequest: deleteDefaultLink, isSubmitting } = useApiMutation();
  const { DefaultPartnerLinkSheet, setIsOpen } = useDefaultPartnerLinkSheet({
    link,
  });

  // Delete default link
  const onConfirm = async () => {
    if (!group) return;

    await deleteDefaultLink(
      `/api/groups/${group.id}/default-links/${link.id}`,
      {
        method: "DELETE",
        onSuccess: async () => {
          await mutate(
            `/api/groups/${group.slug}/default-links?workspaceId=${workspaceId}`,
          );
          setOpenPopover(false);
          toast.success("Default link deleted!");
        },
      },
    );
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Delete default link",
    description: (
      <>
        Are you sure you want to delete{" "}
        <strong>{getPrettyUrl(getUrlWithoutUTMParams(link.url))}</strong>?
        <br />
        <br />
        This won't affect any existing partner links, but if you recreate the
        link, it could result in duplicate links for partners in this group.
        <br />
        <br />
        If you want to change the default link, try editing it instead.
      </>
    ),
    confirmText: "Delete",
    onConfirm,
  });

  return (
    <>
      {confirmModal}
      <div className="group relative">
        <div className="cursor-pointer" onClick={() => setIsOpen(true)}>
          <PartnerLinkPreview
            url={link.url}
            domain={link.domain}
            linkStructure={group?.linkStructure || "query"}
            className={isSubmitting ? "opacity-50" : undefined}
          />
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Popover
            content={
              <div className="grid w-48 grid-cols-1 gap-px p-2">
                <Button
                  text="Edit"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setIsOpen(true);
                  }}
                  icon={<PenWriting className="size-4" />}
                  className="h-9 justify-start px-2"
                  loading={isSubmitting}
                />
                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowConfirmModal(true);
                  }}
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  loading={isSubmitting}
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="secondary"
              className={cn(
                "h-8 w-8 shrink-0 p-0 outline-none transition-all duration-200",
                "border-transparent group-hover:border-neutral-200 data-[state=open]:border-neutral-500",
              )}
              icon={<ThreeDots className="size-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        </div>
      </div>
      {DefaultPartnerLinkSheet}
    </>
  );
}

function DefaultLinkPreviewSkeleton() {
  return (
    <div className="border-border-subtle group relative flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className="relative flex shrink-0 items-center">
        <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
          <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
        </div>
        <div className="relative z-10 p-2">
          <div className="size-4 animate-pulse rounded-full bg-neutral-200 sm:size-6" />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-200" />
        <div className="flex min-h-[20px] items-center gap-1">
          <div className="h-3 w-3 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-1/2 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

function NoDefaultLinks() {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-6 rounded-lg bg-neutral-50 p-4">
      <Hyperlink className="text-content-emphasis size-6" />
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-content-emphasis text-base font-medium">
          Default links
        </h2>
        <p className="text-content-subtle text-sm">
          No default links have been created yet
        </p>
      </div>
    </div>
  );
}
