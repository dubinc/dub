import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";

import { FC } from "react";

interface IFiveStarsComponentProps {
  className?: string;
  iconClassName?: string;
  icon?: string;
}

export const FiveStarsComponent: FC<Readonly<IFiveStarsComponentProps>> = ({
  className,
  iconClassName,
  icon = "solar:star-bold",
}) => (
  <div className={cn("flex text-sm sm:text-xl", className)}>
    {Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        className={cn("text-yellow-500", iconClassName)}
        icon={icon}
      />
    ))}
  </div>
);
