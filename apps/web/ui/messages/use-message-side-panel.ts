"use client";

import { useCallback, useState } from "react";
import {
  MessageSidePanelState,
  nextMessageSidePanelOpen,
} from "./message-side-panel";

// Matches Tailwind's `sm` breakpoint, where the panel stops being full-width.
const SIDE_PANEL_OPEN_QUERY = "(min-width: 640px)";

export function useMessageSidePanel() {
  const [isRightPanelOpen, setIsRightPanelOpen] =
    useState<MessageSidePanelState>(null);

  const toggleRightPanel = useCallback(() => {
    setIsRightPanelOpen((open) =>
      nextMessageSidePanelOpen(
        open,
        window.matchMedia(SIDE_PANEL_OPEN_QUERY).matches,
      ),
    );
  }, []);

  return { isRightPanelOpen, setIsRightPanelOpen, toggleRightPanel };
}
