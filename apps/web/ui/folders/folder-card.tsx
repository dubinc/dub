"use client";

import { FolderProps } from "@/lib/types";
import { Button, PenWriting, Popover, Users } from "@dub/ui";
import { Globe } from "@dub/ui/src/icons";
import { cn, nFormatter } from "@dub/utils";
import { FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteFolderModal } from "../modals/delete-folder-modal";
import { useRenameFolderModal } from "../modals/rename-folder-modal";
import { Delete, ThreeDots } from "../shared/icons";

interface LinksCount {
  folderId: string;
  count: number;
}

interface FolderCardProps {
  folder: FolderProps;
  linksCount: LinksCount[] | undefined;
}

export const FolderCard = ({ folder, linksCount }: FolderCardProps) => {
  const router = useRouter();
  const [openPopover, setOpenPopover] = useState(false);

  const { RenameFolderModal, setShowRenameFolderModal } =
    useRenameFolderModal(folder);

  const { DeleteFolderModal, setShowDeleteFolderModal } =
    useDeleteFolderModal(folder);

  const linkCount =
    linksCount?.find((link) => link.folderId === folder.id)?.count || 0;

  return (
    <>
      <RenameFolderModal />
      <DeleteFolderModal />
      <div className="hover:drop-shadow-card-hover rounded-xl border border-gray-200 bg-white px-5 py-4 sm:h-36">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-green-200 p-0.5 sm:block">
            <div className="rounded-full border-2 border-white p-2 sm:p-2.5">
              <FolderIcon className="size-3" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Popover
              content={
                <div className="grid w-full gap-px p-2 sm:w-48">
                  <Button
                    text="Rename"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowRenameFolderModal(true);
                    }}
                    icon={<PenWriting className="h-4 w-4" />}
                    shortcut="R"
                    className="h-9 px-2 font-medium"
                  />

                  <Button
                    text="Members"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      router.push(`/settings/folders/${folder.id}/members`);
                    }}
                    icon={<Users className="h-4 w-4" />}
                    shortcut="M"
                    className="h-9 px-2 font-medium"
                  />

                  <Button
                    text="Delete"
                    variant="danger-outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowDeleteFolderModal(true);
                    }}
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
                  "h-8 px-1 outline-none transition-all duration-200",
                  "border-transparent data-[state=open]:border-gray-500 sm:group-hover/card:data-[state=closed]:border-gray-200",
                )}
                icon={<ThreeDots className="h-4 w-4 shrink-0" />}
              />
            </Popover>
          </div>
        </div>

        <div className="sm:mt-6">
          <span className="text-sm font-medium text-gray-900">
            {folder.name}
          </span>
          <div className="flex items-center gap-1 text-gray-500">
            <Globe className="size-3.5" />
            <span className="text-sm font-normal">
              {nFormatter(linkCount)} link{linkCount !== 1 && "s"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
