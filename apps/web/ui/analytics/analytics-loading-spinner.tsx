import useWorkspace from "@/lib/swr/use-workspace";
import { LoadingSpinner } from "@dub/ui";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";
import { AnalyticsContext } from "./analytics-provider";

export function AnalyticsLoadingSpinner() {
  const { slug, nextPlan } = useWorkspace();
  const { requiresUpgrade } = useContext(AnalyticsContext);

  return requiresUpgrade ? (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="rounded-full bg-gray-100 p-4">
        <Lock className="h-5 w-5 text-gray-500" />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {nextPlan.name} plan required to view more analytics
      </p>
      <Link
        href={slug ? `/${slug}/upgrade` : "https://dub.co/pricing"}
        {...(slug ? {} : { target: "_blank" })}
        className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-gray-800 hover:ring-4 hover:ring-gray-200"
      >
        Upgrade to {nextPlan.name}
      </Link>
    </div>
  ) : (
    <LoadingSpinner />
  );
}
