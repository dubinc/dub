import { useRouter } from "next/router";
import { INTERVALS } from "@/lib/constants";
import { linkConstructor } from "@/lib/utils";
import useScroll from "@/lib/hooks/use-scroll";
import { ExpandingArrow } from "@/components/shared/icons";
import BadgeSelect from "@/components/shared/badge-select";
import { IntervalProps, StatsProps } from "@/lib/stats";

export default function Toggle({
  data,
  domain,
  modal,
  atModalTop,
}: {
  data: StatsProps;
  domain?: string;
  modal?: boolean;
  atModalTop?: boolean;
}) {
  const router = useRouter();
  const key = (router.query.key as string) || data?.key;
  const currentInterval = (router.query.interval as IntervalProps) || "7d";

  const atTop = useScroll(144) || atModalTop;

  return (
    <div
      className={`z-10 mb-5 ${
        modal ? "top-0" : "top-24"
      } sticky py-5 bg-gray-50 dark:bg-black ${atTop ? "shadow-md" : ""}`}
    >
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="group flex">
          <a
            className="text-xl text-gray-800 dark:text-gray-200 font-semibold"
            href={linkConstructor({ key, domain })}
            target="_blank"
            rel="noreferrer"
          >
            {linkConstructor({ key, domain, pretty: true })}
          </a>
          <ExpandingArrow className="w-5 h-5" />
        </div>
        <div className="px-3 py-1 rounded-md shadow-md dark:shadow-none border bg-white dark:bg-black border-gray-100 dark:border-gray-600">
          <BadgeSelect
            options={INTERVALS}
            selected={currentInterval}
            // @ts-ignore
            selectAction={(interval) => {
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
          />
        </div>
      </div>
    </div>
  );
}
