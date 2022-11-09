import { useRouter } from "next/router";
import { useMemo } from "react";
import BadgeSelect from "@/components/shared/badge-select";
import { ExpandingArrow } from "@/components/shared/icons";
import { INTERVALS } from "@/lib/constants";
import useScroll from "@/lib/hooks/use-scroll";
import { IntervalProps } from "@/lib/stats";
import { linkConstructor } from "@/lib/utils";

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
      className={`z-20 mb-5 ${
        pageType === "stats" ? "top-0" : "top-[6.95rem]"
      } sticky bg-gray-50 py-3 sm:py-5 ${atTop ? "shadow-md" : ""}`}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between space-y-3 px-2.5 sm:flex-row sm:space-y-0 lg:px-0">
        <a
          className="group flex text-lg font-semibold text-gray-800 sm:text-xl"
          href={linkConstructor({ key, domain })}
          target="_blank"
          rel="noreferrer"
        >
          {linkConstructor({ key, domain, pretty: true })}
          <ExpandingArrow className="h-5 w-5" />
        </a>
        <div className="rounded-md border border-gray-100 bg-white px-3 py-1 shadow-md">
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
                  router.query.key as string,
                )}?interval=${interval}`,
                { shallow: true },
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
