import { UIEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BlurImage from "@/components/shared/blur-image";
import { Link, LoadingDots } from "@/components/shared/icons";
import { StatsProps, processRefererData } from "@/lib/stats";
import { nFormatter } from "@/lib/utils";

export default function Referer({ data: rawData }: { data: StatsProps }) {
  const data = {
    ...rawData,
    refererData: useMemo(() => {
      if (rawData?.refererData) {
        return processRefererData(rawData.refererData);
      } else {
        return null;
      }
    }, [rawData]),
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
      className="relative h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide  sm:rounded-lg sm:border-gray-100 sm:shadow-lg"
      onScroll={handleScroll}
    >
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Referrers</h1>
      </div>
      <div
        className={
          data.refererData && data.refererData.length > 0
            ? "grid gap-4"
            : "flex h-[300px] items-center justify-center"
        }
      >
        {data.refererData ? (
          data.refererData.length > 0 ? (
            data.refererData.map(({ display, count }, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
                  <span className="z-10 flex items-center space-x-2 px-2">
                    {display === "(direct)" ? (
                      <Link className="h-4 w-4" />
                    ) : (
                      <BlurImage
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${display}`}
                        alt={display}
                        width={20}
                        height={20}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                    <p className="text-sm text-gray-800">{display}</p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(count / data.totalClicks) * 100}%`,
                    }}
                    className="absolute h-8 origin-left rounded bg-red-100"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="z-10 text-sm text-gray-600">
                  {nFormatter(count)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-600">No data available</p>
          )
        ) : (
          <LoadingDots color="#71717A" />
        )}
      </div>
      <AnimatePresence>
        {data.refererData && data.refererData.length > 9 && !scrolled && (
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
  );
}
