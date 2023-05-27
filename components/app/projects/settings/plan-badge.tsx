import { PlanProps } from "@/lib/types";

export default function PlanBadge({ plan }: { plan: PlanProps }) {
  return (
    <span
      className={`capitalize ${
        plan === "enterprise"
          ? "border-violet-600 bg-violet-600 text-white"
          : plan === "pro"
          ? "border-blue-500 bg-blue-500 text-white"
          : "border-black bg-black text-white"
      } rounded-full border px-2 py-0.5 text-xs font-medium`}
    >
      {plan}
    </span>
  );
}
