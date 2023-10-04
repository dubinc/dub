import { useContext, useState } from "react";
import TabSelect from "@/components/shared/tab-select";
import { LoadingCircle } from "#/ui/icons";
import { DeviceTabs, uaToBot } from "#/lib/stats";
import DeviceIcon from "./device-icon";
import useSWR from "swr";
import { fetcher } from "#/lib/utils";
import { StatsContext } from ".";
import BarList from "./bar-list";
import { Maximize } from "lucide-react";
import Modal from "#/ui/modal";

export default function Devices() {
  const [tab, setTab] = useState<DeviceTabs>("device");

  const { endpoint, queryString, modal } = useContext(StatsContext);

  const { data } = useSWR<
    ({
      [key in DeviceTabs]: string;
    } & { clicks: number })[]
  >(`${endpoint}/${tab}${queryString}`, fetcher);

  const { data: totalClicks } = useSWR<number>(
    `${endpoint}/clicks${queryString}`,
    fetcher,
  );
  const [showModal, setShowModal] = useState(false);

  const barList = (limit?: number) => (
    <BarList
      tab={tab}
      data={
        data?.map((d) => ({
          icon: (
            <DeviceIcon
              display={tab === "bot" ? uaToBot(d.ua) : d[tab]}
              tab={tab}
              className="h-4 w-4"
            />
          ),
          title: tab === "bot" ? uaToBot(d.ua) : d[tab],
          clicks: d.clicks,
        })) || []
      }
      totalClicks={totalClicks || 0}
      barBackground="bg-green-100"
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
          <h1 className="text-xl font-semibold">Devices</h1>
        </div>
        {barList()}
      </Modal>
      <div className="relative z-0 h-[400px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide  sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
        <div className="mb-5 flex justify-between">
          <h1 className="text-xl font-semibold">Devices</h1>
          <TabSelect
            options={["device", "browser", "os", "bot"]}
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
