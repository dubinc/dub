import { Folder as FolderProps } from "@/lib/link-folder/types";
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
}: {
  folder: Pick<FolderProps, "accessLevel" | "id">;
  circlePadding?: string;
}) => {
  if (folder.id === "all-links") {
    return <FolderIcon type="all-links" circlePadding={circlePadding} />;
  }

  if (folder.accessLevel === null) {
    return <FolderIcon type="private" circlePadding={circlePadding} />;
  }

  if (folder.accessLevel === "view") {
    return <FolderIcon type="restricted" circlePadding={circlePadding} />;
  }

  if (folder.accessLevel === "edit") {
    return <FolderIcon type="open" circlePadding={circlePadding} />;
  }

  return null;
};

const FolderIcon = ({
  type = "open",
  circlePadding = "p-2.5",
}: {
  type: "all-links" | "private" | "restricted" | "open";
  circlePadding?: string;
}) => {
  const { borderColor, bgColor, IconComponent } = iconMap[type];

  return (
    <div className={`rounded-full border-2 ${borderColor} ${bgColor}`}>
      <div className={`rounded-full border-2 border-white ${circlePadding}`}>
        <IconComponent className="size-4" />
      </div>
    </div>
  );
};
