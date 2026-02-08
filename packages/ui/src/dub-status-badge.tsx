import { cn } from "@dub/utils";

import { fetcher } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";

export function DubStatusBadge({ className }: { className?: string }) {
  const { data } = useSWR<{
    ongoing_incidents: {
      name: string;
      current_worst_impact:
        | "degraded_performance"
        | "partial_outage"
        | "full_outage";
    }[];
  }>("https://status.dub.co/api/v1/summary", fetcher);

  const [color, setColor] = useState("bg-neutral-200");
  const [status, setStatus] = useState("Loading status...");

  useEffect(() => {
    if (!data) return;
    const { ongoing_incidents } = data;
    if (ongoing_incidents.length > 0) {
      const { current_worst_impact, name } = ongoing_incidents[0];
      const color =
        current_worst_impact === "degraded_performance"
          ? "bg-yellow-500"
          : "bg-red-500";
      setStatus(name);
      setColor(color);
    } else {
      setStatus("All systems operational");
      setColor("bg-green-500");
    }
  }, [data]);

  return (
    <Link
      href="https://status.dub.co"
      target="_blank"
      className={cn(
        "group flex max-w-fit items-center gap-2 rounded-lg border border-neutral-200 bg-white py-2 pl-2 pr-2.5 transition-colors hover:bg-neutral-50 active:bg-neutral-100",
        className,
      )}
    >
      <div className="relative size-2">
        <div
          className={cn(
            "absolute inset-0 m-auto size-2 animate-ping items-center justify-center rounded-full group-hover:animate-none",
            color,
            status === "Loading status..." && "animate-none",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 z-10 m-auto size-2 rounded-full",
            color,
          )}
        />
      </div>
      <p className="text-xs font-medium leading-none text-neutral-600">
        {status}
      </p>
    </Link>
  );
}
