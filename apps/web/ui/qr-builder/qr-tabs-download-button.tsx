import { Button } from "@radix-ui/themes";
import { FC } from "react";

interface IQrTabsDownloadButtonProps {
  onRegistrationClick?: () => void;
  isQrDisabled: boolean;
}

export const QrTabsDownloadButton: FC<IQrTabsDownloadButtonProps> = ({
  onRegistrationClick,
  isQrDisabled,
}) => {
  return (
    <Button
      size="4"
      color={"blue"}
      variant="solid"
      disabled={isQrDisabled}
      className="w-full"
      onClick={onRegistrationClick}
    >
      Download QR code
    </Button>
  );
};
