import { cn } from "@dub/utils";
import Link from "next/link";

export async function StatusBadgeRSC() {
  const { ongoing_incidents } = await fetch(
    "https://status.dub.co/api/v1/summary",
  ).then((res) => res.json());

  let color = "bg-green-500";
  let status = "All systems operational";

  if (ongoing_incidents.length > 0) {
    const { name, current_worst_impact: impact } = ongoing_incidents[0] as {
      name: string;
      current_worst_impact:
        | "degraded_performance"
        | "partial_outage"
        | "full_outage";
    };

    color = impact === "degraded_performance" ? "bg-yellow-500" : "bg-red-500";
    status = name;
  }

  return <StatusBadge color={color} status={status} />;
}

export function StatusBadge({
  color,
  status,
}: {
  color: string;
  status: string;
}) {
  return (
    <Link
      href="https://status.dub.co"
      target="_blank"
      className="flex max-w-fit items-center space-x-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-100"
    >
      <div className={cn("h-3 w-3 rounded-full", color)} />
      <p className="text-sm font-medium text-gray-800">{status}</p>
    </Link>
  );
}
