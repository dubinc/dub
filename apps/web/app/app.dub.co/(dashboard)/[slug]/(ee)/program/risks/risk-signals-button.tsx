"use client";

import { Button } from "@dub/ui";
import { useRiskSignalsSheet } from "./risk-signals-sheet";

export function RiskSignalsButton() {
  const { riskSignalsSheet, setIsOpen } = useRiskSignalsSheet();

  return (
    <>
      {riskSignalsSheet}
      <Button
        type="button"
        text="Risk signals"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="h-9 px-3"
      />
    </>
  );
}
