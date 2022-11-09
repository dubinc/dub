import { useMemo } from "react";
import { UIEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BadgeSelect from "@/components/shared/badge-select";
import { LoadingDots } from "@/components/shared/icons";
import { DeviceTabs, StatsProps, processDeviceData } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";
import DeviceIcon from "./device-icon";

export default function Devices({ data: rawData }: { data: StatsProps }) {
  const [tab, setTab] = useState<DeviceTabs>("device");
  const [showBots, setShowBots] = useState(false); // hide bots by default
  const data = {
    ...rawData,
    deviceData: useMemo(() => {
      if (rawData?.deviceData) {
        return processDeviceData(rawData.deviceData, tab, showBots);
      } else {
        return null;
      }
    }, [rawData, tab, showBots]),
  };

  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (event.currentTarget.scrollTop > 0) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  return (
    <div className="flex h-[420px] flex-col justify-between border border-gray-200 bg-white pt-5 sm:rounded-lg sm:border-gray-100  sm:shadow-lg">
      <div
        className="relative h-full overflow-scroll px-7 scrollbar-hide"
        onScroll={handleScroll}
      >
        <div className="mb-5 flex justify-between">
          <h1 className="text-xl font-semibold">Devices</h1>
          <BadgeSelect
            options={["device", "browser", "os", ...(showBots ? ["bot"] : [])]}
            selected={tab}
            // @ts-ignore
            selectAction={setTab}
          />
        </div>
        <div
          className={
            data.deviceData && data.deviceData.length > 0
              ? "grid gap-4"
              : "flex h-[300px] items-center justify-center"
          }
        >
          {data.deviceData ? (
            data.deviceData.length > 0 ? (
              <>
                {data.deviceData.map(({ display, count }, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
                      <span className="z-10 flex items-center space-x-2 px-2">
                        <DeviceIcon
                          display={display}
                          tab={tab}
                          className="h-4 w-4"
                        />
                        <p
                          className={`text-sm text-gray-800 ${
                            display !== "iOS" ? "capitalize" : ""
                          }`}
                        >
                          {display}
                        </p>
                      </span>
                      <motion.div
                        style={{
                          width: `${(count / data.totalClicks) * 100}%`,
                        }}
                        className="absolute h-8 origin-left bg-green-100"
                        transition={{ ease: "easeOut", duration: 0.3 }}
                        initial={{ transform: "scaleX(0)" }}
                        animate={{ transform: "scaleX(1)" }}
                      />
                    </div>
                    <p className="z-10 text-sm text-gray-600">
                      {nFormatter(count)}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-gray-600">No data available</p>
            )
          ) : (
            <LoadingDots color="#71717A" />
          )}
        </div>
        <AnimatePresence>
          {data.deviceData && data.deviceData.length > 9 && !scrolled && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { type: "linear", duration: 0.2 },
              }}
              exit={{ opacity: 0, y: 50, transition: { duration: 0 } }}
              className="absolute bottom-0 left-0 right-0 flex h-8 w-full items-center justify-center bg-gradient-to-b from-white to-gray-100 text-sm text-gray-500"
            >
              Show more
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-12 flex-shrink-0 items-center justify-start space-x-2 px-7">
        <input
          id="showBots"
          aria-describedby="showBots-description"
          name="showBots"
          type="checkbox"
          checked={showBots}
          onChange={() => setShowBots(!showBots)}
          className="h-4 w-4 rounded text-black focus:outline-none focus:ring-0"
        />
        <label htmlFor="showBots" className="text-sm text-gray-800">
          Include Bots
        </label>
      </div>
    </div>
  );
}
