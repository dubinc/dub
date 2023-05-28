import { motion } from "framer-motion";
import BlurImage from "#/ui/blur-image";
import { Link2 } from "lucide-react";
import { LoadingCircle } from "#/ui/icons";
import { nFormatter } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { GOOGLE_FAVICON_URL } from "@/lib/constants";
import { StatsContext } from ".";
import { useContext } from "react";

export default function Referer() {
  const { endpoint, queryString } = useContext(StatsContext);

  const { data } = useSWR<{ referer: string; clicks: number }[]>(
    `${endpoint}/referer${queryString}`,
    fetcher,
  );

  const { data: totalClicks } = useSWR<number>(
    `${endpoint}/clicks${queryString}`,
    fetcher,
  );

  return (
    <div className="relative z-0 h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Referrers</h1>
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
            data.map(({ referer, clicks }, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
                  <span className="z-10 flex items-center space-x-2 px-2">
                    {referer === "(direct)" ? (
                      <Link2 className="h-4 w-4" />
                    ) : (
                      <BlurImage
                        src={`${GOOGLE_FAVICON_URL}${referer}`}
                        alt={referer}
                        width={20}
                        height={20}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                    <p className="text-sm text-gray-800">{referer}</p>
                  </span>
                  <motion.div
                    style={{
                      width: `${(clicks / (totalClicks || 0)) * 100}%`,
                    }}
                    className="absolute h-8 origin-left rounded bg-red-100"
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    initial={{ transform: "scaleX(0)" }}
                    animate={{ transform: "scaleX(1)" }}
                  />
                </div>
                <p className="z-10 text-sm text-gray-600">
                  {nFormatter(clicks)}
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
