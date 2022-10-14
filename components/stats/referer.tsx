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
      className="relative bg-white px-7 py-5 sm:shadow-lg sm:rounded-lg border border-gray-200 sm:border-gray-100  h-[420px] overflow-scroll scrollbar-hide"
      onScroll={handleScroll}
    >
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Referrals</h1>
      </div>
      <div
        className={
          data.refererData && data.refererData.length > 0
            ? "grid gap-4"
            : "h-[300px] flex justify-center items-center"
        }
      >
        {data.refererData ? (
          data.refererData.length > 0 ? (
            data.refererData.map(({ display, count }, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="relative flex items-center z-10 w-full max-w-[calc(100%-3rem)]">
                  <span className="flex space-x-2 px-2 items-center z-10">
                    {display === "(direct)" ? (
                      <Link className="w-4 h-4" />
                    ) : (
                      <BlurImage
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${display}`}
                        alt={display}
                        width={20}
                        height={20}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <p className="text-gray-800 text-sm">{display}</p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(count / data.totalClicks) * 100}%`,
                    }}
                    className="bg-red-100 absolute h-8 origin-left rounded"
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
        {data.refererData && data.refererData.length > 9 && !scrolled && (
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
