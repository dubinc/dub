"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { TagProps } from "@/lib/types";
import TagBadge from "@/ui/links/tag-badge";
import { useAddEditTagModal } from "@/ui/modals/add-edit-tag-modal";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import { Button, CardList, Popover, useKeyboardShortcut } from "@dub/ui";
import {
  CircleCheck,
  Copy,
  LoadingSpinner,
  PenWriting,
} from "@dub/ui/src/icons";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useContext, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { TagsListContext } from "./page-client";

export function TagCard({
  tag,
  tagsCount,
}: {
  tag: TagProps;
  tagsCount?: { tagId: string; _count: number }[];
}) {
  const { id, slug } = useWorkspace();

  const linksCount = tagsCount?.find(({ tagId }) => tagId === tag.id)?._count;

  const { openMenuTagId, setOpenMenuTagId } = useContext(TagsListContext);
  const openPopover = openMenuTagId === tag.id;
  const setOpenPopover = (open: boolean) => {
    setOpenMenuTagId(open ? tag.id : null);
  };

  const [processing, setProcessing] = useState(false);

  const { AddEditTagModal, setShowAddEditTagModal } = useAddEditTagModal({
    props: tag,
  });

  const [copiedTagId, setCopiedTagId] = useState(false);

  const copyTagId = () => {
    navigator.clipboard.writeText(tag.id);
    setCopiedTagId(true);
    toast.success("Tag ID copied!");
    setTimeout(() => setCopiedTagId(false), 3000);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this tag? All tagged links will be untagged, but they won't be deleted.",
      )
    )
      return;

    setProcessing(true);
    fetch(`/api/tags/${tag.id}?workspaceId=${id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (res.ok) {
          await Promise.all([
            mutate(`/api/tags?workspaceId=${id}`),
            mutate(
              (key) => typeof key === "string" && key.startsWith("/api/links"),
              undefined,
              { revalidate: true },
            ),
          ]);
          toast.success("Tag deleted");
        } else {
          const { error } = await res.json();
          toast.error(error.message);
        }
      })
      .finally(() => setProcessing(false));
  };

  return (
    <>
      <AddEditTagModal />

      <CardList.Card
        key={tag.id}
        onClick={() => setShowAddEditTagModal(true)}
        innerClassName={cn(
          "flex items-center justify-between gap-5 sm:gap-8 md:gap-12 text-sm transition-opacity",
          processing && "opacity-50",
        )}
      >
        <div className="flex min-w-0 grow items-center gap-3">
          <TagBadge color={tag.color} withIcon className="sm:p-1.5" />
          <span className="min-w-0 truncate whitespace-nowrap text-gray-800">
            {tag.name}
          </span>
        </div>

        <div className="flex items-center gap-5 sm:gap-8 md:gap-12">
          {tagsCount !== undefined && (
            <Link
              href={`/${slug}?tagIds=${tag.id}`}
              className="whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm text-gray-800 transition-colors hover:bg-gray-100"
            >
              {nFormatter(linksCount || 0)} link{linksCount !== 1 && "s"}
            </Link>
          )}
          <Popover
            content={
              <div className="grid w-full gap-px p-2 sm:w-48">
                <Button
                  text="Edit"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowAddEditTagModal(true);
                  }}
                  icon={<PenWriting className="h-4 w-4" />}
                  shortcut="E"
                  className="h-9 px-2 font-medium"
                />
                <Button
                  text="Copy Tag ID"
                  variant="outline"
                  onClick={() => copyTagId()}
                  icon={
                    copiedTagId ? (
                      <CircleCheck className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                  shortcut="I"
                  className="h-9 px-2 font-medium"
                />
                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={handleDelete}
                  icon={<Delete className="h-4 w-4" />}
                  shortcut="X"
                  className="h-9 px-2 font-medium"
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
                "h-8 px-1.5 outline-none transition-all duration-200",
                "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
              )}
              icon={
                processing ? (
                  <LoadingSpinner className="h-5 w-5 shrink-0" />
                ) : (
                  <ThreeDots className="h-5 w-5 shrink-0" />
                )
              }
              onClick={() => {
                setOpenPopover(!openPopover);
              }}
            />
          </Popover>
        </div>

        {/* Use consumer + separate component to use hovered state from CardList.Card context */}
        <CardList.Card.Context.Consumer>
          {({ hovered }) => (
            <TagCardKeyboardShortcuts
              enabled={openPopover || (hovered && openMenuTagId === null)}
              onKeyDown={(e) => {
                setOpenPopover(false);
                switch (e.key) {
                  case "e":
                    setShowAddEditTagModal(true);
                    break;
                  case "i":
                    copyTagId();
                    break;
                  case "x":
                    handleDelete();
                    break;
                }
              }}
            />
          )}
        </CardList.Card.Context.Consumer>
      </CardList.Card>
    </>
  );
}

function TagCardKeyboardShortcuts({
  enabled,
  onKeyDown,
}: {
  enabled: boolean;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  useKeyboardShortcut(["e", "i", "x"], onKeyDown, {
    enabled,
  });

  return null;
}
