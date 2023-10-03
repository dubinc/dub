"use client";

import { ReactNode } from "react";
import { nFormatter, timeAgo } from "#/lib/utils";
import Tooltip from "#/ui/tooltip";

export default function Number({
  value,
  unit = "total clicks",
  children,
  lastClicked,
}: {
  value?: number | null;
  unit?: string;
  children: ReactNode;
  lastClicked?: Date | null;
}) {
  if ((!value || value < 1000) && !lastClicked) {
    return children;
  }
  return (
    <Tooltip
      content={
        <div className="block max-w-xs px-4 py-2 text-center text-sm text-gray-700">
          <p className="text-sm font-semibold text-gray-700">
            {nFormatter(value || 0, { full: true })} {unit}
          </p>
          {lastClicked && (
            <p className="mt-1 text-xs text-gray-500">
              Last clicked {timeAgo(lastClicked)}{" "}
              {Date.now() - new Date(lastClicked).getTime() > 60000 &&
              Date.now() - new Date(lastClicked).getTime() < 82800000
                ? "ago"
                : ""}
            </p>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
