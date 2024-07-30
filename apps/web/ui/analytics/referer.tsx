import { BlurImage, useRouterStuff } from "@dub/ui";
import { GOOGLE_FAVICON_URL } from "@dub/utils";
import { Link2 } from "lucide-react";
import { useContext } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function Referer() {
  const { queryParams } = useRouterStuff();

  const { selectedTab } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? "amount" : "count";

  const data = useAnalyticsFilterOption("referers");

  return (
    <AnalyticsCard
      tabs={[{ id: "referers", label: "Referers" }]}
      selectedTabId={"referers"}
      expandLimit={8}
      hasMore={(data?.length ?? 0) > 8}
    >
      {({ limit, setShowModal }) =>
        data ? (
          data.length > 0 ? (
            <BarList
              tab="Referrer"
              data={
                data
                  ?.map((d) => ({
                    icon:
                      d.referer === "(direct)" ? (
                        <Link2 className="h-4 w-4" />
                      ) : (
                        <BlurImage
                          src={`${GOOGLE_FAVICON_URL}${d.referer}`}
                          alt={d.referer}
                          width={20}
                          height={20}
                          className="h-4 w-4 rounded-full"
                        />
                      ),
                    title: d.referer,
                    href: queryParams({
                      set: {
                        referer: d.referer,
                      },
                      getNewPath: true,
                    }) as string,
                    value: d[dataKey] || 0,
                  }))
                  ?.sort((a, b) => b.value - a.value) || []
              }
              isCurrency={dataKey === "amount"}
              maxValue={Math.max(...data?.map((d) => d[dataKey] ?? 0)) ?? 0}
              barBackground="bg-red-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:border-red-500"
              setShowModal={setShowModal}
              {...(limit && { limit })}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">No data available</p>
            </div>
          )
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <AnalyticsLoadingSpinner />
          </div>
        )
      }
    </AnalyticsCard>
  );
}
