"use client";

import { FolderProps } from "@/lib/types";
import { Globe } from "@dub/ui/src/icons";
import { FolderIcon } from "lucide-react";
import Link from "next/link";

interface LinksCount {
  folderId: string;
  count: number;
}

interface FolderCardProps {
  folder: FolderProps;
  linksCount: LinksCount[] | undefined;
}

export const FolderCard = ({ folder, linksCount }: FolderCardProps) => {
  const linkCount = linksCount?.find(
    (link) => link.folderId === folder.id,
  )?.count;

  return (
    <Link
      href={"/"}
      className="hover:drop-shadow-card-hover rounded-xl border border-gray-200 bg-white sm:h-36 sm:px-5 sm:py-4"
    >
      <div className="flex">
        <div className="hidden rounded-full bg-green-200 p-0.5 sm:block">
          <div className="rounded-full border-2 border-white p-2 sm:p-2.5">
            <FolderIcon className="size-3" />
          </div>
        </div>
      </div>

      <div className="sm:mt-6">
        <span className="text-sm font-medium text-gray-900">{folder.name}</span>
        <div className="flex items-center gap-1 text-gray-500">
          <Globe className="size-3.5" />
          <span className="text-sm font-normal">{linkCount || 0} links</span>
        </div>
      </div>
    </Link>
  );
};
