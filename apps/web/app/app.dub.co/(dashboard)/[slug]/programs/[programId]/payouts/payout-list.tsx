"use client";

import { PayoutProps } from "@/lib/types";
import { fetcher } from "@dub/utils/src/functions/fetcher";
import useSWR from "swr";

export function PayoutList({ programId }: { programId: string }) {
  // use SWR to fetch the payouts from /program/id/ payouts

  const { data, error, isLoading } = useSWR<PayoutProps[]>(
    `/api/program/${programId}/payouts?`,
    fetcher,
  );

  console.log({ data, error, isLoading });

  return <div>Payout list</div>;
}
