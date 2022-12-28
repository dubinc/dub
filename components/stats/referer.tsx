import { useRouter } from "next/router";
import { motion } from "framer-motion";
import BlurImage from "@/components/shared/blur-image";
import { Link, LoadingCircle } from "@/components/shared/icons";
import { nFormatter } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import useProject from "@/lib/swr/use-project";

export default function Referer() {
  const router = useRouter();

  const { slug, key, interval } = router.query as {
    slug?: string;
    key: string;
    interval?: string;
  };

  const { project: { domain } = {} } = useProject();

  const { data } = useSWR<{ referer: string; clicks: number }[]>(
    router.isReady &&
      `${
        slug && domain
          ? `/api/projects/${slug}/domains/${domain}/links/${key}/stats/referer`
          : `/api/edge/links/${key}/stats/referer`
      }?interval=${interval || "24h"}`,
    fetcher,
  );

  const { data: totalClicks } = useSWR<number>(
    router.isReady &&
      `${
        slug && domain
          ? `/api/projects/${slug}/domains/${domain}/links/${key}/clicks`
          : `/api/edge/links/${key}/clicks`
      }?interval=${interval || "24h"}`,
    fetcher,
  );

  return (
    <div className="relative h-[420px] overflow-scroll border border-gray-200 bg-white px-7 py-5 scrollbar-hide sm:rounded-lg sm:border-gray-100 sm:shadow-lg">
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
                      <Link className="h-4 w-4" />
                    ) : (
                      <BlurImage
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${referer}`}
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
                      width: `${(clicks / totalClicks) * 100}%`,
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
