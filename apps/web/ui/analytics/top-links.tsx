import { TopLinksTabs } from "@/lib/analytics/types";
import { Modal, TabSelect, useRouterStuff } from "@dub/ui";
import { getApexDomain, linkConstructor, truncate } from "@dub/utils";
import { Maximize, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AnalyticsContext } from ".";
import LinkLogo from "../links/link-logo";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function TopLinks() {
  const [tab, setTab] = useState<TopLinksTabs>("link");

  const {
    selectedTab,
    basePath,
    baseApiPath,
    queryString,
    domain,
    key,
    requiresUpgrade,
  } = useContext(AnalyticsContext);

  useEffect(() => {
    if (domain && key) {
      setTab("url");
    } else {
      setTab("link");
    }
  }, [domain, key]);

  const data = useAnalyticsFilterOption(`top_${tab}s`);

  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const root = searchParams.get("root");
  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab={tab}
      data={
        data?.map((d) => ({
          icon: (
            <LinkLogo
              apexDomain={getApexDomain(d.url)}
              className="h-5 w-5 sm:h-5 sm:w-5"
            />
          ),
          title:
            tab === "link" && d["shortLink"]
              ? d["shortLink"].replace(/^https?:\/\//, "")
              : d.url,
          href: queryParams({
            set: {
              ...(tab === "link"
                ? { domain: d.domain, key: d.key || "_root" }
                : {
                    url: d.url,
                  }),
            },
            getNewPath: true,
          }) as string,
          value: d.count || 0,
          ...(tab === "link" && { linkData: d }),
        })) || []
      }
      maxValue={(data && data[0]?.count) || 0}
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
          <h1 className="text-lg font-semibold">
            {tab === "link" ? "Links" : "URLs"}
          </h1>
        </div>
        {barList()}
      </Modal>
      <div className="scrollbar-hide relative z-0 h-[400px] border border-gray-200 bg-white px-7 py-5 sm:rounded-xl">
        <div className="mb-3 flex justify-between">
          <h1 className="text-lg font-semibold capitalize">
            {tab === "link" ? "Links" : "URLs"}
          </h1>
          {domain && key ? (
            !basePath.startsWith("/stats") && (
              <Link
                className="flex items-center space-x-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500 transition-all hover:bg-gray-100"
                href={
                  queryParams({
                    del: ["domain", "key"],
                    getNewPath: true,
                  }) as string
                }
              >
                <strong className="text-gray-800">
                  {truncate(linkConstructor({ domain, key, pretty: true }), 24)}
                </strong>
                <X className="h-4 w-4" />
              </Link>
            )
          ) : (
            <TabSelect
              options={["Links", "Domains"]}
              selected={
                root === "false" ? "Links" : root === "true" ? "Domains" : null
              }
              selectAction={(option) =>
                queryParams({
                  ...((root === "false" && option === "Links") ||
                  (root === "true" && option === "Domains")
                    ? { del: ["root"] }
                    : {
                        set: {
                          root: option === "Links" ? "false" : "true",
                        },
                      }),
                  replace: true,
                })
              }
            />
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
            <AnalyticsLoadingSpinner />
          </div>
        )}
        {data && data.length > 9 && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute inset-x-0 bottom-4 z-10 mx-auto flex w-full items-center justify-center rounded-md bg-gradient-to-b from-transparent to-white text-gray-500 transition-all hover:text-gray-800 active:scale-95"
          >
            <div className="flex items-center space-x-1 bg-white px-4 py-2">
              <Maximize className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase">View all</p>
            </div>
          </button>
        )}
      </div>
    </>
  );
}
