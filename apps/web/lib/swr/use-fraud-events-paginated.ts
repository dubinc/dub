import { useState } from "react";
import { useFraudEvents } from "./use-fraud-events";
import { useFraudEventsCount } from "./use-fraud-events-count";

export function useFraudEventsPaginated<T = unknown>({
  pageSize = 25,
}: {
  pageSize?: number;
} = {}) {
  const [pagination, setPagination] = useState({
    pageIndex: 1,
    pageSize,
  });

  const { fraudEvents, loading, error, isValidating } = useFraudEvents<T>({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const { fraudEventsCount } = useFraudEventsCount();

  return {
    fraudEvents,
    loading: loading || isValidating,
    error,
    pagination,
    setPagination,
    fraudEventsCount,
  };
}
