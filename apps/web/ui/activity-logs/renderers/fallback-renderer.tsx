import { ActivityLog } from "@/lib/types";

export function FallbackRenderer({ log }: { log: ActivityLog }) {
  return <span className="text-neutral-500">Not available</span>;
}
