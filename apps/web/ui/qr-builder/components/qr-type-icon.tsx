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
        idx === 4
          ? "group-hover:[&>path]:fill-neutral [&>path]:fill-neutral-200"
          : "group-hover:[&>g]:stroke-neutral group-hover:[&>path]:stroke-neutral [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
        isActive &&
          (idx === 4
            ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
            : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
      )}
    />
  );
};
