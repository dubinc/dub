import RatingStars from "@/ui/landing/assets/svg/stars.svg";
import { cn } from "@dub/utils";
import { Text } from "@radix-ui/themes";
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
        <Text
          as="span"
          size={{ initial: "4", md: "3" }}
          weight="regular"
          className="text-secondary-textMuted"
        >
          Excellent user reviews
        </Text>
        <Image width={95} height={17} src={RatingStars} alt="Rating" />
      </div>
      <Text
        as="span"
        size={{ initial: "4", md: "3" }}
        weight="regular"
        className="text-secondary-textMuted"
      >
        <strong>3,318</strong> QR codes generated today!
      </Text>
    </div>
  );
};
