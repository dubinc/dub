import { StatsProps, processLocationData, LocationTabs } from "@/lib/stats";
import BadgeSelect from "@/components/shared/badge-select";
import { useMemo } from "react";
import { nFormatter } from "@/lib/utils";
import { useState, UIEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingDots } from "../shared/icons";

export default function Locations({ data: rawData }: { data: StatsProps }) {
  const [tab, setTab] = useState<LocationTabs>("country");
  const data = {
    ...rawData,
    locationData: useMemo(() => {
      if (rawData?.locationData) {
        return processLocationData(rawData.locationData, tab);
      } else {
        return null;
      }
    }, [rawData, tab]),
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
    <div
      className="relative bg-white px-7 py-5 shadow-lg rounded-lg border border-gray-100 h-[420px] overflow-scroll scrollbar-hide"
      onScroll={handleScroll}
    >
      <div className="mb-5 flex justify-between">
        <h1 className="text-xl font-semibold">Locations</h1>
        <BadgeSelect
          options={["country", "city"]}
          selected={tab}
          // @ts-ignore
          selectAction={setTab}
        />
      </div>
      <div
        className={
          data.locationData && data.locationData.length > 0
            ? "grid gap-4"
            : "h-[300px] flex justify-center items-center"
        }
      >
        {data.locationData ? (
          data.locationData.length > 0 ? (
            data.locationData.map(({ display, code, count }, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="relative flex items-center z-10 w-full max-w-[calc(100%-3rem)]">
                  <span className="flex space-x-2 px-2 items-center z-10">
                    <img
                      src={`https://flag.vercel.app/m/${code}.svg`}
                      className="w-5 h-3"
                    />
                    <p className="text-gray-800 text-sm">{display}</p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(count / data.totalClicks) * 100}%`,
                    }}
                    className="bg-orange-100 absolute h-8 origin-left"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="text-gray-600 text-sm z-10">
                  {nFormatter(count)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 text-sm">No data available</p>
          )
        ) : (
          <LoadingDots color="#71717A" />
        )}
      </div>
      <AnimatePresence>
        {data.locationData && data.locationData.length > 9 && !scrolled && (
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
  );
}
