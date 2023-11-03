import { LocationTabs } from "@/lib/stats";
import { LoadingSpinner, Modal, TabSelect, useRouterStuff } from "@dub/ui";
import { COUNTRIES, fetcher } from "@dub/utils";
import { Maximize } from "lucide-react";
import { useContext, useState } from "react";
import useSWR from "swr";
import { StatsContext } from ".";
import BarList from "./bar-list";

export default function Locations() {
  const [tab, setTab] = useState<LocationTabs>("country");

  const { baseApiPath, queryString, modal } = useContext(StatsContext);

  const { data } = useSWR<{ country: string; city: string; clicks: number }[]>(
    `${baseApiPath}/${tab}?${queryString}`,
    fetcher,
  );

  const { queryParams } = useRouterStuff();
  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab={tab}
      data={
        data?.map((d) => ({
          icon: (
            <img
              alt={d.country}
              src={`https://flag.vercel.app/m/${d.country}.svg`}
              className="h-3 w-5"
            />
          ),
          title: tab === "country" ? COUNTRIES[d.country] : d.city,
          href: queryParams({
            set: {
              [tab]: d[tab],
            },
            getNewPath: true,
          }) as string,
          clicks: d.clicks,
        })) || []
      }
      maxClicks={data?.[0]?.clicks || 0}
      barBackground="bg-orange-100"
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
          <h1 className="text-lg font-semibold">Locations</h1>
        </div>
        {barList()}
      </Modal>
      <div className="scrollbar-hide relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5  sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
        <div className="mb-5 flex justify-between">
          <h1 className="text-lg font-semibold">Locations</h1>
          <TabSelect
            options={["country", "city"]}
            selected={tab}
            // @ts-ignore
            selectAction={setTab}
          />
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
        {!modal && data && data.length > 9 && (
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
