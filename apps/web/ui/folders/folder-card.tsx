"use client";

import { useFolderLinkCount } from "@/lib/swr/use-folder-link-count";
import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import { Globe } from "@dub/ui/icons";
import { nFormatter, pluralize } from "@dub/utils";
import Link from "next/link";
import { FolderActions } from "./folder-actions";
import { FolderIcon } from "./folder-icon";
import { RequestFolderEditAccessButton } from "./request-edit-button";
import { isDefaultFolder } from "./utils";

export const FolderCard = ({ folder }: { folder: Folder }) => {
  const {
    id: workspaceId,
    slug: workspaceSlug,
    defaultFolderId,
  } = useWorkspace();

  const { isLoading: isPermissionsLoading } = useFolderPermissions();
  const canCreateLinks = useCheckFolderPermission(
    folder.id,
    "folders.links.write",
  );

  const unsortedLinks = folder.id === "unsorted";
  const isDefault = isDefaultFolder({ folder, defaultFolderId });

  return (
    <div className="hover:drop-shadow-card-hover relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-all duration-200 sm:h-36">
      <Link
        href={`/${workspaceSlug}/links${unsortedLinks ? "" : `?folderId=${folder.id}`}`}
        className="absolute inset-0 h-full w-full"
      />
      <div className="flex items-center justify-between">
        <FolderIcon folder={folder} />
        <div className="relative flex items-center justify-end gap-1">
          {!unsortedLinks && !isPermissionsLoading && !canCreateLinks && (
            <RequestFolderEditAccessButton
              folderId={folder.id}
              workspaceId={workspaceId!}
            />
          )}
          <FolderActions folder={folder} />
        </div>
      </div>

      <div>
        <span className="flex items-center justify-start gap-1.5 truncate text-sm font-medium text-neutral-900">
          <span className="truncate">{folder.name}</span>

          {folder.id === "unsorted" && (
            <div className="rounded bg-neutral-100 px-1 py-0.5">
              <div className="text-xs font-normal text-black">Unsorted</div>
            </div>
          )}

          {isDefault && (
            <div className="rounded bg-blue-100 px-1 py-0.5">
              <div className="text-xs font-normal text-blue-700">Default</div>
            </div>
          )}
        </span>

        <FolderLinksCount folder={folder} />
      </div>
    </div>
  );
};

function FolderLinksCount({ folder }: { folder: Folder }) {
  const { folderLinkCount, loading } = useFolderLinkCount({
    folderId: folder.id,
  });

  return (
    <div className="mt-1.5 flex items-center gap-1 text-neutral-500">
      <Globe className="size-3.5" />

      {loading ? (
        <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
      ) : (
        <span className="text-sm font-normal">
          {folder.type === "mega"
            ? "10,000+ links"
            : `${nFormatter(folderLinkCount, { full: true })} ${pluralize(
                "link",
                folderLinkCount,
              )}`}
        </span>
      )}
    </div>
  );
}
