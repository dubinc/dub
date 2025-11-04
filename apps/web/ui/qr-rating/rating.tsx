import { AvatarGroup } from "@/components/ui/avatar-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@dub/utils";
import NumberFlow from "@number-flow/react";
import { Text } from "@radix-ui/themes";
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
    <>
      {/* <Separator /> */}
      <div
        className={cn(
          "flex flex-col items-center pb-8 md:pt-2 justify-center gap-2",
          `items-${alignItems}`,
        )}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <AvatarGroup />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Text
              as="span"
              size="4"
              weight="medium"
              className="text-gray-700"
            >
              Trusted by <NumberFlow value={users} className="tabular-nums" /> users
            </Text>
            <Text
              as="span"
              size="3"
              weight="regular"
              className="text-muted-foreground text-center"
            >
              Their QR codes have been scanned{" "}
              <strong className="tabular-nums font-semibold">
                <NumberFlow value={scans} />
              </strong>{" "}
              times
            </Text>
          </div>
        </div>
      </div>
      <Separator />
    </>
  );
};
