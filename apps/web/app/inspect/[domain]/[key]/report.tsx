"use client";
import { cn } from "#/lib/utils";
import { LoadingSpinner } from "#/ui/icons";
import { Flag } from "lucide-react";
import { useState } from "react";

export default function ReportButton({ link }: { link: string }) {
  const [opening, setOpening] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setOpening(true);
        // @ts-ignore
        window.Tally?.openPopup("mJpe4J", {
          width: 540,
          hiddenFields: {
            link,
          },
          onOpen: () => setOpening(false),
        });
      }}
      disabled={opening}
      className={cn(
        "rounded-md p-2 transition-all duration-75 focus:outline-none",
        opening
          ? "cursor-not-allowed bg-gray-100"
          : "hover:bg-red-100 active:bg-red-200",
      )}
    >
      <span className="sr-only">Report</span>
      {opening ? (
        <LoadingSpinner className="h-4 w-4" />
      ) : (
        <Flag className="h-4 w-4 text-red-500" />
      )}
    </button>
  );
}
