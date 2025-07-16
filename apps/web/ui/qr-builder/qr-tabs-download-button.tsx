import { Button } from "@dub/ui";
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
      color="blue"
      className="w-full"
      onClick={onRegistrationClick}
      disabled={isQrDisabled}
      text="Download QR code"
    />
  );
};
