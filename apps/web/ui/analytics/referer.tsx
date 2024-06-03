import { BlurImage, Modal, useRouterStuff } from "@dub/ui";
import { GOOGLE_FAVICON_URL } from "@dub/utils";
import { Link2, Maximize } from "lucide-react";
import { useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

function RefererOld() {
  const data = useAnalyticsFilterOption("referers");

  const { queryParams } = useRouterStuff();
  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab="Referrer"
      data={
        data?.map((d) => ({
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
          value: d.count || 0,
        })) || []
      }
      maxValue={(data && data[0]?.count) || 0}
      barBackground="bg-red-100"
      hoverBackground="bg-red-100/50"
      setShowModal={setShowModal}
      {...(limit && { limit })}
    />
  );

  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-lg"
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-lg font-semibold">Referers</h1>
        </div>
        {barList()}
      </Modal>
      <div className="scrollbar-hide relative z-0 h-[400px] border border-gray-200 bg-white px-7 py-5 sm:rounded-xl">
        <div className="mb-3 flex justify-between">
          <h1 className="text-lg font-semibold">Referers</h1>
        </div>
        {data ? (
          data.length > 0 ? (
            barList(9)
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">No data available</p>
            </div>
          )
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <AnalyticsLoadingSpinner />
          </div>
        )}
        {data && data.length > 9 && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute inset-x-0 bottom-4 z-10 mx-auto flex w-full items-center justify-center space-x-2 rounded-md bg-gradient-to-b from-transparent to-white py-2 text-gray-500 transition-all hover:text-gray-800 active:scale-95"
          >
            <Maximize className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">View all</p>
          </button>
        )}
      </div>
    </>
  );
}

export default function Referer() {
  const { queryParams } = useRouterStuff();

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
                data?.map((d) => ({
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
                  value: d.count || 0,
                })) || []
              }
              maxValue={(data && data[0]?.count) || 0}
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
