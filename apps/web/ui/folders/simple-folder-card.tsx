import { FolderSummary } from "@/lib/types";
import { cn } from "@dub/utils/src";
import { FolderIcon } from "./folder-icon";

export function SimpleFolderCard({
  folder,
  className,
}: {
  folder: FolderSummary;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5",
        className,
      )}
    >
      <div className="relative flex-none">
        <FolderIcon folder={folder} shape="rounded" />
      </div>
      <div className="flex min-w-0 flex-col text-sm leading-tight">
        <span className="truncate text-sm font-semibold text-neutral-800">
          {folder.name}
        </span>
        {folder.description && (
          <span className="truncate text-xs text-neutral-500">
            {folder.description}
          </span>
        )}
      </div>
    </div>
  );
}
