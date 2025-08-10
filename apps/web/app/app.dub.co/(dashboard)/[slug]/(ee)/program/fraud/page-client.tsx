"use client";

import { useFraudEvents } from "@/lib/swr/use-fraud-events";
import { FraudEvent } from "@/lib/types";
import { RiskReviewSheet } from "@/ui/partners/risk-review-sheet";
import { useRouterStuff } from "@dub/ui";
import { useEffect, useState } from "react";
import { FraudEventStats } from "./fraud-event-stats";
import { FraudEventTable } from "./fraud-event-table";

export function ProgramFraudRiskPageClient() {
  const { fraudEvents } = useFraudEvents();
  const { queryParams, searchParams } = useRouterStuff();

  const [detailsSheetState, setDetailsSheetState] = useState<{
    open: boolean;
    fraudEventId: string | null;
  }>({
    open: false,
    fraudEventId: null,
  });

  const { currentFraudEvent, loading: isCurrentPartnerLoading } =
    useCurrentFraudEvent({
      fraudEvents,
      fraudEventId: detailsSheetState.fraudEventId,
    });

  useEffect(() => {
    const fraudEventId = searchParams.get("fraudEventId");

    if (fraudEventId) {
      setDetailsSheetState({ open: true, fraudEventId });
    } else {
      setDetailsSheetState({ open: false, fraudEventId: null });
      queryParams({ del: "fraudEventId", scroll: false });
    }
  }, [searchParams]);

  return (
    <>
      {currentFraudEvent && (
        <RiskReviewSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open: boolean) =>
            setDetailsSheetState((s) => ({ ...s, open }))
          }
          fraudEvent={currentFraudEvent}
        />
      )}

      <FraudEventStats />
      <div className="mt-6">
        <FraudEventTable isValidating={isCurrentPartnerLoading} />
      </div>
    </>
  );
}

// Gets the current fraud event from the loaded fraudEvents array if available, or a separate fetch if not
function useCurrentFraudEvent({
  fraudEvents,
  fraudEventId,
}: {
  fraudEvents?: FraudEvent[];
  fraudEventId: string | null;
}) {
  let currentFraudEvent = fraudEventId
    ? fraudEvents?.find(({ id }) => id === fraudEventId)
    : null;

  const shouldFetch = fraudEvents && fraudEventId && !currentFraudEvent;

  const { fraudEvents: fetchedFraudEvents, loading } = useFraudEvents({
    query: {
      fraudEventId: shouldFetch ? fraudEventId : undefined,
    },
  });

  if (
    !currentFraudEvent &&
    fetchedFraudEvents &&
    fetchedFraudEvents.length > 0
  ) {
    currentFraudEvent = fetchedFraudEvents[0];
  }

  return {
    currentFraudEvent,
    loading,
  };
}
