import { FolderAccessLevel, Folder as FolderProps } from "@/lib/types";
import {
  Folder,
  FolderBookmark,
  FolderLock,
  FolderPlus,
  FolderShield,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";

const FolderOpen = ({ className }: { className: string }) => {
  return <Folder className={cn("text-blue-800", className)} />;
};

const folderIconsMap: Record<
  FolderAccessLevel | "new" | "unsorted" | "none",
  {
    borderColor: string;
    bgColor: string;
    icon: React.ElementType;
  }
> = {
  read: {
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-100",
    icon: FolderShield,
  },
  write: {
    borderColor: "border-blue-200",
    bgColor: "bg-blue-100",
    icon: FolderOpen,
  },
  none: {
    borderColor: "border-orange-200",
    bgColor: "bg-orange-100",
    icon: FolderLock,
  },
  new: {
    borderColor: "border-neutral-200",
    bgColor: "bg-neutral-100",
    icon: FolderPlus,
  },
  unsorted: {
    borderColor: "border-green-200",
    bgColor: "bg-green-100",
    icon: FolderBookmark,
  },
} as const;

const determineFolderIcon = (
  folder: Pick<FolderProps, "id" | "accessLevel">,
) => {
  if (["new", "unsorted"].includes(folder.id)) {
    return folder.id;
  }

  if (folder.accessLevel) {
    return folder.accessLevel;
  }

  return "none";
};

export const FolderIcon = ({
  folder,
  shape = "rounded",
  className,
}: {
  folder: Pick<FolderProps, "id" | "accessLevel">;
  shape?: "rounded" | "square";
  className?: string;
}) => {
  const iconType = determineFolderIcon(folder);
  const { borderColor, bgColor, icon: Icon } = folderIconsMap[iconType];

  return (
    <div
      className={cn(
        shape === "rounded" ? "rounded-full bg-white p-0.5" : "rounded-md",
        borderColor,
        shape !== "rounded" && bgColor,
        "border",
      )}
    >
      <div
        className={cn(
          shape === "rounded" ? "rounded-full p-2" : "rounded-md p-1",
          bgColor,
        )}
      >
        <Icon className={cn("size-4", className)} />
      </div>
    </div>
  );
};
