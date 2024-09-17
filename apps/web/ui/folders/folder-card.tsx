"use client";

import { FolderProps } from "@/lib/types";
import { Avatar } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { FolderIcon, Link2 } from "lucide-react";
import Link from "next/link";

export const FolderCard = ({ folder }: { folder: FolderProps }) => {
  return (
    <Link
      href={"/"}
      className="hover:drop-shadow-card-hover relative h-auto rounded-xl border border-gray-200 bg-white p-3 transition-[filter] sm:h-36 sm:p-4 sm:px-5 sm:py-4"
    >
      <div className="flex">
        <div className="hidden rounded-full bg-green-200 p-0.5 sm:block">
          <div className="rounded-full border-2 border-white p-1.5 sm:p-2">
            <FolderIcon className="size-2.5 sm:size-3" />
          </div>
        </div>
      </div>

      <div className="sm:mt-6">
        <span className="text-sm font-semibold text-gray-900 sm:text-base">
          {folder.name}
        </span>
        <div className="mt-1 flex flex-col gap-1 text-gray-500 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-1 sm:gap-2">
            <Link2 className="size-3 rotate-90 transform sm:size-4" />
            <span className="text-xs font-normal sm:text-sm">100 links</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Avatar
              user={{
                image:
                  "https://avatars.githubusercontent.com/u/28986134?s=64&v=4",
              }}
              className="size-3 sm:size-4"
            />
            <span className="text-xs font-normal sm:text-sm">
              {formatDate(folder.createdAt, {
                year: undefined,
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
