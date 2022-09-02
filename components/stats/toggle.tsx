import { useRouter } from "next/router";
import { INTERVALS } from "@/lib/constants";
import { linkConstructor } from "@/lib/utils";
import useScroll from "@/lib/hooks/use-scroll";
import { useStatsContext } from "@/components/stats/context";
import { ExpandingArrow } from "@/components/shared/icons";
import { IntervalProps } from "@/lib/stats";

export default function Toggle() {
  const router = useRouter();
  const key = router.query.key as string;
  const currentInterval = (router.query.interval as IntervalProps) || "24h";

  const { atTop: atContextTop } = useStatsContext();
  const atTop = useScroll(144) || atContextTop;

  return (
    <div
      className={`mb-5 sticky top-0 py-5 bg-gray-50 dark:bg-black ${
        atTop ? "shadow-md" : ""
      }`}
    >
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="group flex">
          <a
            className="text-xl text-gray-800 dark:text-gray-200 font-semibold"
            href={linkConstructor(key)}
            target="_blank"
            rel="noreferrer"
          >
            {linkConstructor(key, true)}
          </a>
          <ExpandingArrow className="w-5 h-5" />
        </div>
        <div className="flex space-x-1 p-1 rounded-md shadow-md dark:shadow-none border bg-white dark:bg-black border-gray-100 dark:border-gray-600">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              className={`${
                currentInterval === interval
                  ? "bg-blue-50 dark:bg-gray-600"
                  : ""
              } w-14 py-1.5 text-sm dark:text-white rounded-md`}
              onClick={() => {
                router.push(
                  {
                    query: {
                      ...router.query,
                      interval,
                    },
                  },
                  `/stats/${encodeURI(
                    router.query.key as string
                  )}?interval=${interval}`,
                  { shallow: true }
                );
              }}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
