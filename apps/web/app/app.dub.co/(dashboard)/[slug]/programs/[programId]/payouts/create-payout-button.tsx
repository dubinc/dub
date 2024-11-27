"use client";

import { useCreatePayoutSheet } from "@/ui/partners/create-payout-sheet";
import { Button } from "@dub/ui";
import { Plus } from "@dub/ui/src/icons";

export function CreatePayoutButton() {
  const { createPayoutSheet, setIsOpen: setShowCreatePayoutSheet } =
    useCreatePayoutSheet();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setShowCreatePayoutSheet(true)}
        text="Create payout"
        icon={<Plus className="size-4" />}
      />
      {createPayoutSheet}
    </>
  );
}
