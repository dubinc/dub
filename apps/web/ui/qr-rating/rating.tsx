import RatingStars from "@/ui/landing/assets/webp/stars.webp";
import { cn } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Text } from "@radix-ui/themes";
import Image from "next/image";
import { FC, useEffect, useState } from "react";

interface IRatingProps {
  alignItems?: "center" | "start" | "end";
}

export const Rating: FC<IRatingProps> = ({ alignItems = "center" }) => {
  const [users, setUsers] = useState<number>(1151456);
  const [scans, setScans] = useState<number>(33259893);

  useEffect(() => {
    const usersInterval = setInterval(() => {
      setUsers((prevUsers) => prevUsers + 1);
    }, 2000);

    const scansInterval = setInterval(() => {
      setScans((prevScans) => prevScans + 4);
    }, 1000);

    return () => {
      clearInterval(usersInterval);
      clearInterval(scansInterval);
    };
  }, []);

  return (
    <div
      className={cn(
        "mt-4 flex flex-col items-center justify-center gap-0.5 md:hidden",
        `items-${alignItems}`,
      )}
    >
      <div className="flex flex-row items-center gap-1">
        <Text
          as="span"
          size="4"
          weight="regular"
          className="text-secondary-textMuted"
        >
          Join <NumberFlow value={users} className="tabular-nums" /> users
        </Text>
        <Image width={95} height={17} src={RatingStars} alt="Rating" />
      </div>
      <Text
        as="span"
        size="4"
        weight="regular"
        className="text-secondary-textMuted max-w-[300px] text-center"
      >
        Their QR codes have been scanned{" "}
        <strong className="tabular-nums">
          <NumberFlow value={scans} />
        </strong>{" "}
        times
      </Text>
    </div>
  );
};
