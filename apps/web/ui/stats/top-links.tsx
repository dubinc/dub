import { LoadingSpinner, Modal, useRouterStuff } from "@dub/ui";
import { fetcher, linkConstructor } from "@dub/utils";
import { Maximize, X } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { StatsContext } from ".";
import BarList from "./bar-list";
import { TopLinksTabs } from "@/lib/stats";

export default function TopLinks() {
  const [tab, setTab] = useState<TopLinksTabs>("link");

  const { baseApiPath, queryString, domain, key } = useContext(StatsContext);

  useEffect(() => {
    if (domain && key) {
      setTab("url");
    } else {
      setTab("link");
    }
  }, [domain, key]);

  const { data } = useSWR<
    ({ domain: string; key: string } & {
      [key in TopLinksTabs]: string;
    } & { clicks: number })[]
  >(`${baseApiPath}/top_${tab}s?${queryString}`, fetcher);

  const { queryParams } = useRouterStuff();
  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab={tab}
      data={
        data?.map((d) => ({
          title:
            tab === "link"
              ? linkConstructor({
                  domain: d.domain,
                  key: d.key,
                  pretty: true,
                })
              : d[tab],
          href: queryParams({
            set:
              tab === "link"
                ? {
                    domain: d.domain,
                    key: d.key,
                  }
                : {
                    [tab]: d[tab],
                  },
            getNewPath: true,
          }) as string,
          clicks: d.clicks,
        })) || []
      }
      maxClicks={data?.[0]?.clicks || 0}
      barBackground="bg-blue-100"
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
          <h1 className="text-lg font-semibold">Top Links</h1>
        </div>
        {barList()}
      </Modal>
      <div className="scrollbar-hide relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
        <div className="mb-5 flex justify-between">
          <h1 className="text-lg font-semibold capitalize">
            Top {tab === "link" ? "Links" : "URLs"}
          </h1>
          {domain && key && (
            <button
              className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-500 transition-all duration-75 hover:bg-gray-100 active:scale-[0.98] sm:px-3"
              onClick={() => {
                queryParams({
                  del: ["domain", "key"],
                });
              }}
            >
              <strong className="text-gray-800">
                {linkConstructor({ domain, key, pretty: true })}
              </strong>
              <X className="h-4 w-4" />
            </button>
          )}
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
            <LoadingSpinner />
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
