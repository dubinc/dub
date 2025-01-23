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
    IconComponent: React.ElementType;
  }
> = {
  new: {
    borderColor: "border-gray-200",
    bgColor: "bg-gray-100",
    IconComponent: FolderPlus,
  },
  unsorted: {
    borderColor: "border-green-200",
    bgColor: "bg-green-100",
    IconComponent: FolderBookmark,
  },
  write: {
    borderColor: "border-blue-200",
    bgColor: "bg-blue-100",
    IconComponent: FolderOpen,
  },
  read: {
    borderColor: "border-indigo-200",
    bgColor: "bg-indigo-100",
    IconComponent: FolderShield,
  },
  none: {
    borderColor: "border-orange-200",
    bgColor: "bg-orange-100",
    IconComponent: FolderLock,
  },
} as const;

const findIconIdentifier = (
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

// TODO:
// Combine with FolderSquareIcon with FolderAccessIcon

export const FolderAccessIcon = ({
  folder,
  circlePadding = "p-2.5",
  withBorder = true,
  className,
}: {
  folder: Pick<FolderProps, "id" | "accessLevel">;
  circlePadding?: string;
  withBorder?: boolean;
  className?: string;
}) => {
  const { borderColor, bgColor, IconComponent } =
    folderIconsMap[findIconIdentifier(folder)];

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
  const { borderColor, bgColor, IconComponent } =
    folderIconsMap[findIconIdentifier(folder)];

  return (
    <div className={cn("rounded-md border", borderColor, bgColor)}>
      <div className="p-1">
        <IconComponent className={iconClassName} />
      </div>
    </div>
  );
};
