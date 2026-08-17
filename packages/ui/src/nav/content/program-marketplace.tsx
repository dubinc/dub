import { APP_DOMAIN, cn, createHref, fetcher } from "@dub/utils";
import { Link as NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import useSWR from "swr";
import {
  PROGRAM_MARKETPLACE_HREF,
  PROGRAM_MARKETPLACE_SLUGS,
} from "../../content";
import { Grid } from "../../grid";
import { NAV_UTM_PARAMS } from "./shared";

type MarketplaceProgram = {
  slug: string;
  name: string;
  logo: string | null;
};

// left, top, size and rotation (in px/deg) within the 614 × 104 logo canvas
const LOGO_SLOTS = [
  { left: 405, top: 22, size: 24, rotate: 0 },
  { left: 461, top: 1, size: 38, rotate: 0 },
  { left: 307.28, top: 24.83, size: 33, rotate: -6.57 },
  { left: 342, top: 55, size: 30, rotate: 0 },
  { left: 410.5, top: 64.5, size: 31, rotate: 0 },
  { left: 573.5, top: 39.5, size: 39, rotate: 0 },
  { left: 448, top: 31, size: 34, rotate: 0 },
  { left: 526.5, top: 26.5, size: 33, rotate: 0 },
  { left: 93.5, top: 19.5, size: 41, rotate: 0 },
  { left: 162.5, top: 11.5, size: 29, rotate: 0 },
  { left: 2.05, top: 28.03, size: 38, rotate: -6.57 },
  { left: 36.5, top: 58.5, size: 35, rotate: 0 },
  { left: 106, top: 69, size: 34, rotate: 0 },
  { left: 268.5, top: 43.5, size: 43, rotate: 0 },
  { left: 146, top: 38, size: 32, rotate: 0 },
  { left: 225.5, top: 34.5, size: 29, rotate: 0 },
];

// deterministic (so it matches between server and client) per-slot drift, to
// make the logos bob around like they're floating in water
function getDrift(index: number) {
  const x = Math.sin(index * 12.9898) * 4;
  const y = Math.cos(index * 78.233) * 3;

  return {
    x: [0, x, -x * 0.6, 0],
    y: [0, y, -y, 0],
    duration: 9 + (index % 5),
    delay: (index % 7) * 0.5,
  };
}

function ProgramMarketplaceLogos() {
  const reducedMotion = useReducedMotion();

  const { data: programs } = useSWR<MarketplaceProgram[]>(
    `${APP_DOMAIN}/api/misc/program-logos?slugs=${PROGRAM_MARKETPLACE_SLUGS.join(",")}`,
    fetcher,
    {
      dedupingInterval: 600000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const logos = programs?.filter(({ logo }) => Boolean(logo)) ?? [];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-6 top-1/2 h-[104px] w-[614px] -translate-y-1/2"
    >
      {LOGO_SLOTS.map(({ left, top, size, rotate }, index) => {
        const program = logos.length ? logos[index % logos.length] : null;
        const { x, y, duration, delay } = getDrift(index);

        return (
          <motion.div
            key={index}
            className="absolute"
            style={{ left, top, width: size, height: size }}
            animate={reducedMotion ? undefined : { x, y }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div
              className={cn(
                "size-full overflow-hidden rounded-full border border-neutral-50 bg-neutral-200 transition-opacity duration-300 dark:border-white/10 dark:bg-white/10",
                !program && "opacity-40",
              )}
              style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
            >
              {program?.logo && (
                <img
                  src={program.logo}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ProgramMarketplaceSection({ domain }: { domain: string }) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={createHref(PROGRAM_MARKETPLACE_HREF, domain, {
          ...NAV_UTM_PARAMS,
          utm_campaign: domain,
          utm_content: "Program Marketplace",
        })}
        className={cn(
          "group relative isolate flex items-center overflow-hidden border-t border-neutral-100 bg-neutral-50 px-6 py-3 transition-colors duration-75",
          "hover:bg-neutral-100 dark:border-white/[0.15] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
        )}
      >
        {/* offset so a horizontal cell edge sits just below the middle of the bar */}
        <Grid
          cellSize={60}
          patternOffset={[-12, -32]}
          className="text-neutral-200/60 [mask-image:linear-gradient(90deg,transparent_20%,black)] dark:text-white/10"
        />

        <ProgramMarketplaceLogos />

        <div className="relative flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              Program Marketplace
            </span>
            <span className="flex h-4 items-center rounded-md bg-blue-100 px-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
              NEW
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-white/60">
            Browse our available partner programs{" "}
            <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">
              →
            </span>
          </p>
        </div>
      </Link>
    </NavigationMenuLink>
  );
}
