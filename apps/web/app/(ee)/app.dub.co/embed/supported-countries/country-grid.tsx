"use client";

import { useMediaQuery } from "@dub/ui";
import { cn, COUNTRIES } from "@dub/utils";
import { useState } from "react";

export function CountryGrid({ countries }: { countries: string[] }) {
  const { isMobile } = useMediaQuery();
  const showCount = isMobile ? 16 : 30;
  const [expanded, setExpanded] = useState(false);

  const displayCountries =
    countries.length <= showCount || expanded
      ? countries
      : countries.slice(0, showCount);

  return (
    <div className="not-prose relative px-2">
      <div
        className={cn(
          "grid grid-cols-2 gap-5 py-4 sm:grid-cols-3",
          countries.length > showCount && !expanded && "max-h-[420px]",
          countries.length > showCount && expanded && "pb-12",
        )}
      >
        {displayCountries.map((country) => (
          <div key={country} className="flex items-center gap-3">
            <img
              src={`https://hatscripts.github.io/circle-flags/flags/${country.toLowerCase()}.svg`}
              alt={country}
              width={32}
              height={32}
              className="size-5 rounded-full border border-neutral-200 shadow-md"
              draggable={false}
            />
            <span className="text-sm font-medium">{COUNTRIES[country]}</span>
          </div>
        ))}
      </div>
      {countries.length > showCount && (
        <>
          {!expanded && (
            <div className="absolute bottom-0 h-24 w-full bg-gradient-to-t from-neutral-50 to-transparent" />
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`absolute left-1/2 -translate-x-1/2 transform rounded-full border border-gray-200 bg-white px-4 py-1 text-sm text-gray-500 shadow-sm hover:text-gray-700 ${
              expanded ? "-bottom-2" : "bottom-6"
            }`}
          >
            {expanded
              ? "Show less"
              : `Show ${countries.length - showCount} more`}
          </button>
        </>
      )}
    </div>
  );
}
