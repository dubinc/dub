import { Button } from "@dub/ui";
import { FC } from "react";
import { trackClientEvents } from "../../core/integration/analytic";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";

interface IQrTabsDownloadButtonProps {
  sessionId?: string;
  onRegistrationClick?: () => void;
  isQrDisabled: boolean;
}

export const QrTabsDownloadButton: FC<IQrTabsDownloadButtonProps> = ({
  sessionId,
  onRegistrationClick,
  isQrDisabled,
}) => {
  const handleClick = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "landing",
        content_value: "download",
        content_group: "customize_qr",
        event_category: "nonAuthorized",
      },
      sessionId,
    });

    onRegistrationClick?.();
  };

  return (
    <Button
      size="4"
      color="blue"
      className="w-full"
      onClick={handleClick}
      disabled={isQrDisabled}
      text="Download QR code"
    />
  );
};
