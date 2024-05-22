import { LoadingSpinner } from "@dub/ui";
import { Lock } from "lucide-react";
import { useContext } from "react";
import { AnalyticsContext } from ".";

export function AnalyticsLoadingSpinner() {
  const { requiresUpgrade } = useContext(AnalyticsContext);

  return requiresUpgrade ? (
    <Lock className="h-5 w-5 text-gray-500" />
  ) : (
    <LoadingSpinner />
  );
}
