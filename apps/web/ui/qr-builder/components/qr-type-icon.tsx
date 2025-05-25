import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { FC } from "react";

interface IQrTypeIconProps {
  icon: string;
  idx: number;
  isActive: boolean;
  className?: string;
}

export const QrTypeIcon: FC<IQrTypeIconProps> = ({
  icon,
  idx,
  isActive,
  className,
}) => {
  return (
    <Icon
      icon={icon}
      className={cn(
        className,
        idx === 2
          ? "group-hover:[&>path]:fill-secondary [&>path]:fill-neutral-200"
          : "group-hover:[&>g]:stroke-secondary group-hover:[&>path]:stroke-secondary [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
        isActive &&
          (idx === 2
            ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
            : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
      )}
    />
  );
};
