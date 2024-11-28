import { PlanProps } from "@/lib/types";
import { Badge } from "@dub/ui";
import { capitalize } from "@dub/utils";

export default function PlanBadge({ plan }: { plan: PlanProps }) {
  return (
    <Badge
      variant={
        plan === "enterprise"
          ? "violet"
          : plan.startsWith("business")
            ? "sky"
            : plan === "pro"
              ? "blue"
              : "black"
      }
    >
      {capitalize(plan)}
    </Badge>
  );
}
