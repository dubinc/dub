"use client";

import { cn, nFormatter } from "#/lib/utils";
import { ReactNode, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Fuse from "fuse.js";
import Number from "#/ui/number";

export default function BarList({
  tab,
  data,
  barBackground,
  totalClicks,
  limit,
}: {
  tab: string;
  data: {
    icon: ReactNode;
    title: string;
    clicks: number;
  }[];
  totalClicks: number;
  barBackground: string;
  limit?: number;
}) {
  const [search, setSearch] = useState("");

  const fuse = useMemo(() => {
    if (limit) {
      return null;
    }
    return new Fuse(data, {
      keys: ["title"],
    });
  }, [limit, data]);

  const filteredData = useMemo(() => {
    if (limit) {
      return data.slice(0, limit);
    } else {
      return search ? fuse!.search(search).map((r) => r.item) : data;
    }
  }, [data, limit, search, fuse]);

  const bars = (
    <div className="grid gap-4">
      {filteredData.map(({ icon, title, clicks }, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <div className="relative z-10 flex w-full max-w-[calc(100%-3rem)] items-center">
            <span className="z-10 flex items-center space-x-2 px-2">
              {icon}
              <p className="text-sm text-gray-800">{title}</p>
            </span>
            <motion.div
              style={{
                width: `${(clicks / (totalClicks || 0)) * 100}%`,
              }}
              className={cn("absolute h-8 origin-left", barBackground)}
              transition={{ ease: "easeOut", duration: 0.3 }}
              initial={{ transform: "scaleX(0)" }}
              animate={{ transform: "scaleX(1)" }}
            />
          </div>
          <Number value={clicks}>
            <p className="z-10 text-sm text-gray-600">{nFormatter(clicks)}</p>
          </Number>
        </div>
      ))}
    </div>
  );

  if (limit) {
    return bars;
  } else {
    return (
      <>
        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-y-0 left-7 flex items-center">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            autoFocus
            className="w-full rounded-md border border-gray-300 py-2 pl-10 text-black placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-gray-600 sm:text-sm"
            placeholder={`Search ${tab}...`}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <div className="flex justify-between px-4 pb-1 pt-0">
            <p className="text-xs font-semibold uppercase text-gray-600">
              {tab}
            </p>
            <p className="text-xs font-semibold uppercase text-gray-600">
              Clicks
            </p>
          </div>
          <div className="h-[50vh] overflow-auto p-4 md:h-[40vh]">{bars}</div>
        </div>
      </>
    );
  }
}
