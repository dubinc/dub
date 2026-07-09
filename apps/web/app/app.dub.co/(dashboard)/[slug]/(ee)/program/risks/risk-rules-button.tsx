"use client";

import { Button } from "@dub/ui";
import { useRiskRulesSheet } from "./risk-rules-sheet";

export function RiskRulesButton() {
  const { riskRulesSheet, setIsOpen } = useRiskRulesSheet();

  return (
    <>
      {riskRulesSheet}
      <Button
        type="button"
        text="Risk rules"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="h-9 px-3"
      />
    </>
  );
}
