import { cn } from "@dub/utils/src";
import { Button } from "@radix-ui/themes";
import Link from "next/link";
import { FC } from "react";

interface IQrTabsDownloadButtonProps {
  isQrDisabled: boolean;
}

export const QrTabsDownloadButton: FC<IQrTabsDownloadButtonProps> = ({
  isQrDisabled,
}) => {
  return (
    <Button
      size={{ initial: "4", sm: "3" }}
      color={"blue"}
      variant="solid"
      disabled={isQrDisabled}
      className="w-full"
    >
      <Link
        className={cn(
          "",
          isQrDisabled && "pointer-events-none cursor-not-allowed",
        )}
        href={"/register"}
      >
        Download QR code
      </Link>
    </Button>
  );
};
