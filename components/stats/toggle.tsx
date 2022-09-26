import { useRouter } from "next/router";
import { INTERVALS } from "@/lib/constants";
import { linkConstructor } from "@/lib/utils";
import useScroll from "@/lib/hooks/use-scroll";
import { ExpandingArrow } from "@/components/shared/icons";
import BadgeSelect from "@/components/shared/badge-select";
import { IntervalProps, StatsProps } from "@/lib/stats";
import { useMemo } from "react";

export default function Toggle({
  domain,
  atModalTop,
}: {
  domain?: string;
  atModalTop?: boolean;
}) {
  const router = useRouter();
  const { slug, key, interval } = router.query as {
    slug?: string;
    key: string;
    interval?: string;
  };

  const pageType = useMemo(() => {
    if (slug && key) {
      return slug;
    } else if (key && router.asPath.startsWith("/links")) {
      return "links";
    } else if (key && router.asPath.startsWith("/stats")) {
      return "stats";
    }
    return "stats";
  }, [slug, key, router.asPath]);

  const currentInterval = (interval as IntervalProps) || "24h";

  const atTop = useScroll(80) || atModalTop;

  return (
    <div
      className={`z-10 mb-5 ${
        pageType === "stats" ? "top-0" : "top-24"
      } sticky py-5 bg-gray-50 ${atTop ? "shadow-md" : ""}`}
    >
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <a
          className="group flex text-xl text-gray-800 font-semibold"
          href={linkConstructor({ key, domain })}
          target="_blank"
          rel="noreferrer"
        >
          {linkConstructor({ key, domain, pretty: true })}
          <ExpandingArrow className="w-5 h-5" />
        </a>
        <div className="px-3 py-1 rounded-md shadow-md border bg-white border-gray-100">
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
                `/${pageType}/${encodeURI(
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
