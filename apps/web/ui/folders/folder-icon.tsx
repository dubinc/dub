import { Folder as FolderProps } from "@/lib/types";
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

const folderIconsMap = {
  unsorted: {
    borderColor: "border-green-200",
    bgColor: "bg-green-100",
    IconComponent: FolderBookmark,
  },
  private: {
    borderColor: "border-orange-200",
    bgColor: "bg-orange-100",
    IconComponent: FolderLock,
  },
  restricted: {
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-100",
    IconComponent: FolderShield,
  },
  open: {
    borderColor: "border-blue-200",
    bgColor: "bg-blue-100",
    IconComponent: FolderOpen,
  },
  new: {
    borderColor: "border-gray-200",
    bgColor: "bg-gray-100",
    IconComponent: FolderPlus,
  },
} as const;

const accessLevelMap = {
  new: "new",
  unsorted: "unsorted",
  private: "private",
  view: "restricted",
  edit: "open",
} as const;

// TODO:
// Combine with FolderSquareIcon with FolderAccessIcon

export const FolderAccessIcon = ({
  folder,
  circlePadding = "p-2.5",
  withBorder = true,
  className,
}: {
  folder: Pick<FolderProps, "accessLevel" | "id">;
  circlePadding?: string;
  withBorder?: boolean;
  className?: string;
}) => {
  const type =
    accessLevelMap[folder.id] ||
    accessLevelMap[folder.accessLevel || "private"];

  if (!type) {
    return null;
  }

  const { borderColor, bgColor, IconComponent } = folderIconsMap[type];

  if (!withBorder) {
    return (
      <div className={`${className} p-1.5 ${bgColor}`}>
        <IconComponent className="size-4" />
      </div>
    );
  }

  return (
    <div className={cn("border", className, borderColor, bgColor)}>
      <div className={cn(circlePadding)}>
        <IconComponent className="size-4" />
      </div>
    </div>
  );
};

export const FolderSquareIcon = ({
  folder,
  iconClassName,
}: {
  folder: Pick<FolderProps, "id" | "accessLevel">;
  iconClassName?: string;
}) => {
  const folderType =
    accessLevelMap[folder.id] ||
    accessLevelMap[folder.accessLevel || "private"];

  if (!folderType) {
    return null;
  }

  const { borderColor, bgColor, IconComponent } = folderIconsMap[folderType];

  return (
    <div className={cn("rounded-md border", borderColor, bgColor)}>
      <div className="p-1">
        <IconComponent className={iconClassName} />
      </div>
    </div>
  );
};
