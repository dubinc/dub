import { cn } from "@dub/utils";
import { motion } from "framer-motion";

const upPath = "M6.75 8.25L4 11L1.25 8.25";
const downPath = "M6.75 3.75L4 1L1.25 3.75";

export default function SortOrder({
  order,
  className,
}: {
  order: "asc" | "desc" | null;
  className?: string;
}) {
  return (
    <svg
      className={cn("w-2 text-neutral-950", className)}
      viewBox="0 0 8 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        className={cn(!order && "opacity-40")}
        animate={{ d: order === "asc" ? downPath : upPath }}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.path
        className="opacity-40"
        animate={{ d: order === "asc" ? upPath : downPath }}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
