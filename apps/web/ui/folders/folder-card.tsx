"use client";

import {
  useCheckFolderPermission,
  useFolderPermissions,
} from "@/lib/swr/use-folder-permissions";
import useLinksCount from "@/lib/swr/use-links-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { Folder } from "@/lib/types";
import { useIntersectionObserver } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import { cn, nFormatter } from "@dub/utils";
import Link from "next/link";
import { useRef } from "react";
import { FolderActions } from "./folder-actions";
import { FolderIcon } from "./folder-icon";
import { RequestFolderEditAccessButton } from "./request-edit-button";

export const FolderCard = ({ folder }: { folder: Folder }) => {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { isLoading: isPermissionsLoading } = useFolderPermissions();
  const canCreateLinks = useCheckFolderPermission(
    folder.id,
    "folders.links.write",
  );

  const unsortedLinks = folder.id === "unsorted";

  return (
    <div
      className={cn(
        "hover:drop-shadow-card-hover relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-all duration-200 sm:h-36",
        folder.type === "mega" && "sm:h-32",
      )}
    >
      <Link
        href={`/${workspaceSlug}${unsortedLinks ? "" : `?folderId=${folder.id}`}`}
        className="absolute inset-0 h-full w-full"
      />
      <div className="flex items-center justify-between">
        <FolderIcon folder={folder} />

        {!unsortedLinks && (
          <div className="relative flex items-center justify-end gap-1">
            {!isPermissionsLoading && !canCreateLinks && (
              <RequestFolderEditAccessButton
                folderId={folder.id}
                workspaceId={workspaceId!}
              />
            )}
            <FolderActions folder={folder} />
          </div>
        )}
      </div>

      <div>
        <span className="flex items-center justify-start gap-1.5 truncate text-sm font-medium text-neutral-900">
          <span className="truncate">{folder.name}</span>

          {folder.id === "unsorted" && (
            <div className="rounded bg-neutral-100 p-1">
              <div className="text-xs font-normal text-black">Unsorted</div>
            </div>
          )}
        </span>

        {folder.type !== "mega" && <LinksCount folderId={folder.id} />}
      </div>
    </div>
  );
};

function LinksCount({ folderId }: { folderId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const entry = useIntersectionObserver(ref);
  const isInView = entry?.isIntersecting;

  const { data: linkCount, loading } = useLinksCount({
    enabled: isInView,
    ignoreParams: true,
    query:
      folderId === "unsorted"
        ? {}
        : {
            folderId,
          },
  });

  return (
    <div ref={ref} className="mt-1.5 flex items-center gap-1 text-neutral-500">
      <Globe className="size-3.5" />

      {loading ? (
        <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-200" />
      ) : (
        <span className="text-sm font-normal">
          {nFormatter(linkCount)} link{linkCount !== 1 && "s"}
        </span>
      )}
    </div>
  );
}
