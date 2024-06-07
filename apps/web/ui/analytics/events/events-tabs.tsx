import { useRouterStuff } from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import { useContext } from "react";
import { AnalyticsContext } from "../analytics-provider";

export default function EventsTabs() {
  const { searchParams, queryParams } = useRouterStuff();

  const tab = searchParams.get("tab");
  const { totalEvents } = useContext(AnalyticsContext);

  return (
    <div className="grid grid-cols-3 gap-4">
      {["clicks", "leads", "sales"].map((event) => (
        <button
          className={cn(
            "rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-all",
            tab === event && "border-black shadow-[0_0_0_1px_black_inset]",
          )}
          onClick={() =>
            queryParams({
              set: { tab: event },
            })
          }
        >
          <p className="text-sm text-gray-600">{capitalize(event)}</p>
          <p className="mt-2 text-2xl">
            {(totalEvents?.[event] ?? 0).toLocaleString()}
          </p>
        </button>
      ))}
    </div>
  );
}
