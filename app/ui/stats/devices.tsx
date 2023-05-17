import { useContext, useState } from "react";
import { motion } from "framer-motion";
import BadgeSelect from "@/components/shared/badge-select";
import { LoadingCircle } from "#/ui/icons";
import { DeviceTabs, uaToBot } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";
import DeviceIcon from "./device-icon";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { StatsContext } from ".";

export default function Devices() {
  const [tab, setTab] = useState<DeviceTabs>("device");

  const { endpoint, queryString } = useContext(StatsContext);

  const { data } = useSWR<
    ({
      [key in DeviceTabs]: string;
    } & { clicks: number })[]
  >(`${endpoint}/${tab}${queryString}`, fetcher);

  const { data: totalClicks } = useSWR<number>(
    `${endpoint}/clicks${queryString}`,
    fetcher,
  );

  return (
    <div className="relative z-0 h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide  sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex justify-between">
        <h1 className="text-xl font-semibold">Devices</h1>
        <BadgeSelect
          options={["device", "browser", "os", "bot"]}
          selected={tab}
          // @ts-ignore
          selectAction={setTab}
        />
      </div>
      <div
        className={
          data && data.length > 0
            ? "grid gap-4"
            : "flex h-[300px] items-center justify-center"
        }
      >
        {data ? (
          data.length > 0 ? (
            data.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
                  <span className="z-10 flex items-center space-x-2 px-2">
                    <DeviceIcon
                      display={tab === "bot" ? uaToBot(d.ua) : d[tab]}
                      tab={tab}
                      className="h-4 w-4"
                    />
                    <p className="text-sm text-gray-800">
                      {tab === "bot" ? uaToBot(d.ua) : d[tab]}
                    </p>
                  </span>
                  <motion.div
                    style={{
                      width: `${
                        (d.clicks /
                          (tab === "bot"
                            ? data?.reduce(
                                (acc, curr) => acc + curr.clicks,
                                0,
                              ) || 0
                            : totalClicks || 0)) *
                        100
                      }%`,
                    }}
                    className="absolute h-8 origin-left bg-green-100"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="z-10 text-sm text-gray-600">
                  {nFormatter(d.clicks)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No data available</p>
          )
        ) : (
          <LoadingCircle />
        )}
      </div>
    </div>
  );
}
