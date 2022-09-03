import { StatsProps, processLocationData, LocationType } from "@/lib/stats";
import BadgeSelect from "@/components/shared/badge-select";
import { nFormatter } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import { LoadingDots } from "../shared/icons";

export default function Locations({ data }: { data: StatsProps }) {
  const [type, setType] = useState<LocationType>("country");

  return (
    <div className="bg-white dark:bg-black px-7 py-5 shadow-lg dark:shadow-none rounded-lg border border-gray-100 dark:border-gray-600">
      <div className="mb-5 flex justify-between">
        <h1 className="text-xl dark:text-white font-semibold">Locations</h1>
        <BadgeSelect
          options={["country", "city"]}
          selected={type}
          // @ts-ignore
          selectAction={setType}
        />
      </div>
      <div className="grid gap-4">
        {data.locationData ? (
          processLocationData(data.locationData, type).map(
            ({ display, code, count }) => (
              <div className="flex justify-between items-center">
                <div className="relative flex items-center z-10 w-full max-w-[calc(100%-3rem)]">
                  <span className="flex space-x-2 px-2 items-center z-10">
                    <img
                      src={`https://flag.vercel.app/l/${code}.svg`}
                      className="w-4 h-4"
                    />
                    <p className="text-gray-800 dark:text-gray-200 text-sm">
                      {display}
                    </p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(count / data.totalClicks) * 100}%`,
                    }}
                    className="bg-orange-100 dark:bg-orange-900 absolute h-8 origin-left"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {nFormatter(count)}
                </p>
              </div>
            )
          )
        ) : (
          <div className="h-96 w-full flex justify-center items-center">
            <LoadingDots color="#71717A" />
          </div>
        )}
      </div>
    </div>
  );
}
