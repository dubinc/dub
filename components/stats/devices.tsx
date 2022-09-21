import { StatsProps, processDeviceData, DeviceTabs } from "@/lib/stats";
import BadgeSelect from "@/components/shared/badge-select";
import { useMemo } from "react";
import { nFormatter } from "@/lib/utils";
import { useState, UIEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingDots } from "@/components/shared/icons";
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
    <div className="flex flex-col justify-between bg-white pt-5 shadow-lg rounded-lg border border-gray-100 h-[420px]">
      <div
        className="relative overflow-scroll scrollbar-hide px-7"
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
              : "h-[300px] flex justify-center items-center"
          }
        >
          {data.deviceData ? (
            data.deviceData.length > 0 ? (
              <>
                {data.deviceData.map(({ display, count }, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="relative flex items-center z-10 w-full max-w-[calc(100%-3rem)]">
                      <span className="flex space-x-2 px-2 items-center z-10">
                        <DeviceIcon
                          display={display}
                          tab={tab}
                          className="w-4 h-4"
                        />
                        <p
                          className={`text-gray-800 text-sm ${
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
                        className="bg-green-100 absolute h-8 origin-left"
                        transition={{ ease: "easeOut", duration: 0.3 }}
                        initial={{ transform: "scaleX(0)" }}
                        animate={{ transform: "scaleX(1)" }}
                      />
                    </div>
                    <p className="text-gray-600 text-sm z-10">
                      {nFormatter(count)}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-600 text-sm">No data available</p>
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
              className="absolute w-full h-8 flex justify-center items-center bottom-0 left-0 right-0 bg-gradient-to-b from-white to-gray-100 text-sm text-gray-500"
            >
              Show more
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-start items-center space-x-2 px-7 h-12 flex-shrink-0">
        <input
          id="showBots"
          aria-describedby="showBots-description"
          name="showBots"
          type="checkbox"
          checked={showBots}
          onChange={() => setShowBots(!showBots)}
          className="h-4 w-4 rounded text-black focus:outline-none focus:ring-0"
        />
        <label htmlFor="showBots" className="text-gray-800 text-sm">
          Include Bots
        </label>
      </div>
    </div>
  );
}
