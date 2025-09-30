"use client";

import { Button, useKeyboardShortcut, useMediaQuery } from "@dub/ui";
import { useBountySheet } from "../bounties/add-edit-bounty-sheet";

export function CreateCampaignButton() {
  const { isMobile } = useMediaQuery();
  const { BountySheet, setShowCreateBountySheet } = useBountySheet({
    nested: false,
  });

  useKeyboardShortcut("c", () => setShowCreateBountySheet(true));

  return (
    <>
      {BountySheet}
      <Button
        type="button"
        onClick={() => setShowCreateBountySheet(true)}
        text={`Create${isMobile ? "" : " email"}`}
        shortcut="C"
        className="h-8 px-3 sm:h-9"
      />
    </>
  );
}
