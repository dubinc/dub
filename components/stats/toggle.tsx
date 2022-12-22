import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ExpandingArrow,
  Tick,
} from "@/components/shared/icons";
import { INTERVALS } from "@/lib/constants";
import useScroll from "@/lib/hooks/use-scroll";
import { linkConstructor } from "@/lib/utils";
import IconMenu from "@/components/shared/icon-menu";
import Popover from "@/components/shared/popover";

export default function Toggle({
  domain,
  atModalTop,
}: {
  domain?: string;
  atModalTop?: boolean;
}) {
  const router = useRouter();
  const {
    slug,
    key,
    interval = "24h",
  } = router.query as {
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

  const atTop = useScroll(80) || atModalTop;
  const [openPopover, setOpenPopover] = useState(false);

  const selectedInterval = useMemo(() => {
    return INTERVALS.find((s) => s.slug === interval) || INTERVALS[1];
  }, [interval]);

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
        <Popover
          content={
            <div className="w-full p-2 md:w-48">
              {INTERVALS.map(({ display, slug }) => (
                <button
                  key={slug}
                  onClick={() => {
                    router.push(
                      {
                        query: {
                          ...router.query,
                          interval: slug,
                        },
                      },
                      `/${pageType}/${encodeURI(
                        router.query.key as string,
                      )}?interval=${slug}`,
                      { shallow: true },
                    );
                  }}
                  className="flex w-full items-center justify-between space-x-2 rounded-md p-2 hover:bg-gray-100 active:bg-gray-200"
                >
                  <p className="text-sm">{display}</p>
                  {selectedInterval.slug === slug && (
                    <Tick className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          }
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <button
            onClick={() => setOpenPopover(!openPopover)}
            className="flex w-full items-center justify-between space-x-2 rounded-md bg-white px-3 py-2.5 shadow transition-all duration-75 hover:shadow-md active:scale-95 sm:w-48"
          >
            <IconMenu
              text={selectedInterval.display}
              icon={<Calendar className="h-4 w-4" />}
            />
            <ChevronDown
              className={`h-5 w-5 text-gray-400 ${
                openPopover ? "rotate-180 transform" : ""
              } transition-all duration-75`}
            />
          </button>
        </Popover>
      </div>
    </div>
  );
}
