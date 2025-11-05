import { cn } from "@dub/utils";
import { StaticImageData } from "next/image";
import { FC } from "react";
import { StyleIcon } from "./style-icon";

interface StyleButtonProps {
  icon: StaticImageData;
  selected: boolean;
  onClick: () => void;
  iconSize?: number;
  className?: string;
  disabled?: boolean;
  applyBlackFilter?: boolean;
}

export const StyleButton: FC<StyleButtonProps> = ({
  icon,
  selected,
  onClick,
  iconSize = 40,
  className,
  disabled = false,
  applyBlackFilter = false,
}) => {
  return (
    <button
      className={cn(
        "rounded-md border p-3 transition",
        selected
          ? "border-secondary"
          : "border-border-300 hover:border-secondary",
        {
          "cursor-not-allowed opacity-50": disabled,
        },
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <StyleIcon
        src={icon}
        size={iconSize}
        className={cn({ "brightness-0": applyBlackFilter && !disabled })}
      />
    </button>
  );
};
