import { useContext, useState } from "react";
import TabSelect from "@/components/shared/tab-select";
import { COUNTRIES } from "#/lib/constants";
import { LocationTabs } from "#/lib/stats";
import { LoadingCircle } from "#/ui/icons";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "#/lib/utils";
import { StatsContext } from ".";
import { Maximize } from "lucide-react";
import BarList from "#/ui/stats/bar-list";
import Modal from "#/ui/modal";

export default function Locations() {
  const [tab, setTab] = useState<LocationTabs>("country");
  const router = useRouter();

  const { endpoint, queryString, modal } = useContext(StatsContext);

  const { data } = useSWR<{ country: string; city: string; clicks: number }[]>(
    router.isReady && `${endpoint}/${tab}${queryString}`,
    fetcher,
  );

  const { data: totalClicks } = useSWR<number>(
    router.isReady && `${endpoint}/clicks${queryString}`,
    fetcher,
  );

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
          clicks: d.clicks,
        })) || []
      }
      totalClicks={totalClicks || 0}
      barBackground="bg-orange-100"
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
          <h1 className="text-xl font-semibold">Locations</h1>
        </div>
        {barList()}
      </Modal>
      <div className="relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide  sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
        <div className="mb-5 flex justify-between">
          <h1 className="text-xl font-semibold">Locations</h1>
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
            <LoadingCircle />
          </div>
        )}
        {!modal && data && data.length > 9 && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute inset-x-0 bottom-4 z-10 mx-auto flex max-w-fit items-center space-x-2 rounded-md bg-white px-4 py-1.5 text-gray-500 transition-all hover:text-gray-800 active:scale-95"
          >
            <Maximize className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">View all</p>
          </button>
        )}
      </div>
    </>
  );
}
