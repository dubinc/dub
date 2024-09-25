import { Folder as FolderProps } from "@/lib/folder/types";
import {
  Folder,
  FolderBookmark,
  FolderLock,
  FolderShield,
} from "@dub/ui/src/icons";

const iconMap = {
  "all-links": {
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
    bgColor: "bg-indigo-200",
    IconComponent: FolderShield,
  },
  open: {
    borderColor: "border-blue-200",
    bgColor: "bg-blue-100",
    IconComponent: Folder,
  },
};

export const FolderAccessIcon = ({
  folder,
  circlePadding = "p-2.5",
  withBorder = true,
}: {
  folder: Pick<FolderProps, "accessLevel" | "id">;
  circlePadding?: string;
  withBorder?: boolean;
}) => {
  if (folder.id === "all-links") {
    return (
      <FolderIcon
        type="all-links"
        circlePadding={circlePadding}
        withBorder={withBorder}
      />
    );
  }

  if (folder.accessLevel === null) {
    return (
      <FolderIcon
        type="private"
        circlePadding={circlePadding}
        withBorder={withBorder}
      />
    );
  }

  if (folder.accessLevel === "view") {
    return (
      <FolderIcon
        type="restricted"
        circlePadding={circlePadding}
        withBorder={withBorder}
      />
    );
  }

  if (folder.accessLevel === "edit") {
    return (
      <FolderIcon
        type="open"
        circlePadding={circlePadding}
        withBorder={withBorder}
      />
    );
  }

  return null;
};

const FolderIcon = ({
  type = "open",
  circlePadding = "p-2.5",
  withBorder = true,
}: {
  type: "all-links" | "private" | "restricted" | "open";
  circlePadding?: string;
  withBorder?: boolean;
}) => {
  const { borderColor, bgColor, IconComponent } = iconMap[type];

  if (!withBorder) {
    return (
      <div className={`rounded-full p-1.5 ${bgColor}`}>
        <IconComponent className="size-4" />
      </div>
    );
  }

  return (
    <div className={`rounded-full border ${borderColor} ${bgColor}`}>
      <div className={`rounded-full border-2 border-white ${circlePadding}`}>
        <IconComponent className="size-4" />
      </div>
    </div>
  );
};
