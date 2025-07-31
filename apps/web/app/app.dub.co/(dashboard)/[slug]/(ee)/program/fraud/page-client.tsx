"use client";

import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { FraudEvent } from "@/lib/types";
import { RiskReviewSheet } from "@/ui/partners/risk-review-sheet";
import { useRouterStuff } from "@dub/ui";
import { useEffect, useState } from "react";
import { FraudEventStats } from "./fraud-event-stats";
import { FraudEventTable } from "./fraud-event-table";

export function ProgramFraudRiskPageClient() {
  const { queryParams, searchParams } = useRouterStuff();

  const [detailsSheetState, setDetailsSheetState] = useState<{
    open: boolean;
    fraudEvent: FraudEvent | null;
  }>({ open: false, fraudEvent: null });

  const { fraudEvents } = useFraudEvents();

  useEffect(() => {
    const fraudEventId = searchParams.get("fraudEventId");

    if (!fraudEvents || !fraudEventId) {
      setDetailsSheetState({ open: false, fraudEvent: null });
      return;
    }

    const fraudEvent = fraudEvents.find((f) => f.id === fraudEventId);

    if (fraudEvent) {
      setDetailsSheetState({ open: true, fraudEvent });
    } else {
      setDetailsSheetState({ open: false, fraudEvent: null });
      queryParams({ del: "fraudEventId", scroll: false });
    }
  }, [searchParams, fraudEvents]);

  return (
    <>
      {detailsSheetState.fraudEvent && (
        <RiskReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open: boolean) =>
            setDetailsSheetState((s) => ({ ...s, open }))
          }
          fraudEvent={detailsSheetState.fraudEvent}
        />
      )}

      <FraudEventStats />
      <div className="mt-6">
        <FraudEventTable />
      </div>
    </>
  );
}
