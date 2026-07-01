"use client";

import type { PartnerContentSearchPartner } from "@/lib/swr/use-partner-content-search";
import { NetworkPartnerProps } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export function useNetworkDetailSheet({
  selectedPartnerId,
  isContentSearchMode,
  contentSearchPartners,
  partners,
}: {
  selectedPartnerId: string | null;
  isContentSearchMode: boolean;
  contentSearchPartners: PartnerContentSearchPartner[] | undefined;
  partners: NetworkPartnerProps[] | undefined;
}) {
  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >(
    selectedPartnerId
      ? { open: true, partnerId: selectedPartnerId }
      : { open: false, partnerId: null },
  );

  useEffect(() => {
    if (selectedPartnerId) {
      setDetailsSheetState({ open: true, partnerId: selectedPartnerId });
    } else {
      setDetailsSheetState({ open: false, partnerId: null });
    }
  }, [selectedPartnerId]);

  const sheetPartnerIds = useMemo(
    () =>
      isContentSearchMode
        ? contentSearchPartners?.map(({ partnerId }) => partnerId)
        : partners?.map(({ id }) => id),
    [contentSearchPartners, isContentSearchMode, partners],
  );

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!sheetPartnerIds?.length || !detailsSheetState.partnerId) {
      return [null, null];
    }

    const currentIndex = sheetPartnerIds.findIndex(
      (id) => id === detailsSheetState.partnerId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? sheetPartnerIds[currentIndex - 1] : null,
      currentIndex < sheetPartnerIds.length - 1
        ? sheetPartnerIds[currentIndex + 1]
        : null,
    ];
  }, [detailsSheetState.partnerId, sheetPartnerIds]);

  return {
    detailsSheetState,
    setDetailsSheetState,
    previousPartnerId,
    nextPartnerId,
  };
}
