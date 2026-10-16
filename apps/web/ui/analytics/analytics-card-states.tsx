import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";

// the body of an analytics card without rows
export function AnalyticsCardEmptyState({
  message = "No data available",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <p className="text-sm text-neutral-600">{message}</p>
    </div>
  );
}

// the body of an analytics card while its rows load
export function AnalyticsCardLoadingState() {
  return (
    <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
      <AnalyticsLoadingSpinner />
    </div>
  );
}
