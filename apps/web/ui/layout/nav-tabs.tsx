"use client";

import useDomains from "@/lib/swr/use-domains";
import useLinksCount from "@/lib/swr/use-links-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { useScroll } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

export default function NavTabs() {
  const pathname = usePathname();
  const { slug } = useParams() as { slug?: string };
  const domain = useSearchParams()?.get("domain");
  const { loading, error, flags } = useWorkspace();

  const tabs = useMemo(
    () => [
      { name: "Links", href: `/${slug}` },
      { name: "Analytics", href: `/${slug}/analytics` },
      { name: "Events", href: `/${slug}/events` },
      { name: "Settings", href: `/${slug}/settings` },
    ],
    [flags],
  );

  const { loading: loadingDomains } = useDomains();
  const { data: linksCount } = useLinksCount({ ignoreParams: true });

  const scrolled = useScroll(80);

  if (!slug || error) return null;

  return (
    <div
      className={cn(
        "scrollbar-hide relative flex gap-x-2 overflow-x-auto transition-all",
        scrolled && "sm:translate-x-9",
      )}
    >
      {tabs.map(({ name, href }) => {
        const isActive =
          href === `/${slug}` ? pathname === href : pathname.startsWith(href);

        return (
          <Link key={href} href={href} className="relative">
            <div className="mx-1 my-1.5 rounded-md px-3 py-1.5 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200">
              <p className="text-sm text-gray-600 hover:text-black">{name}</p>
            </div>
            {isActive && (
              <motion.div
                layoutId="indicator"
                transition={{
                  duration: 0.25,
                }}
                className="absolute bottom-0 w-full px-1.5"
              >
                <div className="h-0.5 bg-black" />
              </motion.div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
