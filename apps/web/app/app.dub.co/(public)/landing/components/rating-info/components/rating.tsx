import RatingStars from "@/ui/landing/assets/svg/stars.svg";
import { cn } from "@dub/utils";
import Image from "next/image";
import { FC } from "react";

interface IRatingProps {
  alignItems?: "center" | "start" | "end";
}

export const Rating: FC<IRatingProps> = ({ alignItems = "center" }) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        `items-${alignItems}`,
      )}
    >
      <div className="flex flex-row gap-1">
        <span className="text-secondary-textMuted text-base font-normal">
          Excellent user reviews
        </span>
        <Image width={95} height={17} src={RatingStars} alt="Rating" />
      </div>
      <span className="text-secondary-textMuted text-base">
        <strong>3.318</strong> GetQR taken today!
      </span>
    </div>
  );
};
