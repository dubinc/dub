"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { PayoutProps } from "@/lib/types";
import { CardList } from "@dub/ui";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import { useState } from "react";
import useSWR from "swr";
import { TagCardPlaceholder } from "../../../settings/library/tags/tag-card-placeholder";
import { PayoutsListContext } from "./context";
import { PayoutRow } from "./payout-row";

export function PayoutsList({ programId }: { programId: string }) {
  const { id: workspaceId } = useWorkspace();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const {
    data: payouts,
    error,
    isLoading,
  } = useSWR<PayoutProps[]>(
    `/api/programs/${programId}/payouts?workspaceId=${workspaceId}`,
    fetcher,
  );

  const payoutsCount = 10;

  return (
    <PayoutsListContext.Provider value={{ openMenu, setOpenMenu }}>
      <CardList variant="compact" loading={isLoading}>
        {payouts?.length
          ? payouts.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} />
            ))
          : Array.from({ length: 6 }).map((_, idx) => (
              <TagCardPlaceholder key={idx} />
            ))}
      </CardList>
    </PayoutsListContext.Provider>
  );
}
