"use client";

import { useUser } from "@/ui/contexts/user";
import { Button, useKeyboardShortcut } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";

interface CreateQRButtonProps {
  onClick: () => void;
}

export function CreateQRButton({ onClick }: CreateQRButtonProps) {
  const user = useUser();

  useKeyboardShortcut("c", onClick);

  const handleClick = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: "profile",
        content_value: "create_qr",
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
    onClick();
  };

  return <Button text="Create QR code" onClick={handleClick} />;
}
