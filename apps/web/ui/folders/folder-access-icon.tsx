import { Folder as FolderProps } from "@/lib/folder/types";
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

  return (
    <FolderIcon
      type={type}
      circlePadding={circlePadding}
      withBorder={withBorder}
      className={className}
    />
  );
};

const FolderIcon = ({
  type = "open",
  circlePadding = "p-2.5",
  withBorder = true,
  className = "rounded-full",
}: {
  type: "unsorted" | "private" | "restricted" | "open";
  circlePadding?: string;
  withBorder?: boolean;
  className?: string;
}) => {
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
}: {
  folder: Pick<FolderProps, "id" | "accessLevel">;
}) => {
  const type =
    accessLevelMap[folder.id] ||
    accessLevelMap[folder.accessLevel || "private"];

  if (!type) {
    return null;
  }

  const { borderColor, bgColor, IconComponent } = folderIconsMap[type];

  return (
    <div className={cn("rounded-md border", borderColor, bgColor)}>
      <div className="p-1.5">
        <IconComponent className="size-4" />
      </div>
    </div>
  );
};
