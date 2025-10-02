import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { FC } from "react";

interface QrTypeIconProps {
  icon: string;
  idx: number;
  isActive: boolean;
  className?: string;
}

const ICON_COLORS = [
  "text-blue-500",
  "text-orange-500",
  "text-green-500",
  "text-purple-500",
  "text-yellow-500",
  "text-red-500",
];

export const QrTypeIcon: FC<QrTypeIconProps> = ({
  icon,
  idx,
  isActive,
  className,
}) => {
  return (
    <Icon
      icon={icon}
      className={cn(
        "transition-colors",
        isActive ? "text-secondary" : ICON_COLORS[idx % ICON_COLORS.length],
        className,
      )}
    />
  );
};
