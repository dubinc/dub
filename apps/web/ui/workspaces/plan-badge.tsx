import { PlanProps } from "@/lib/types";
import { Badge } from "@dub/ui";
import { capitalize } from "@dub/utils";

export default function PlanBadge({ plan }: { plan: PlanProps }) {
  return (
    <Badge
      variant={
        plan === "enterprise"
          ? "violetGradient"
          : plan === "advanced"
            ? "amberGradient"
            : plan.startsWith("business")
              ? "blueGradient"
              : plan === "pro"
                ? "blueGradient"
                : "neutralGradient"
      }
    >
      {capitalize(plan)}
    </Badge>
  );
}
