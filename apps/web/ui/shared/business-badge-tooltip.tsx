import useWorkspace from "@/lib/swr/use-workspace";
import { BadgeTooltip, InfoTooltip, type TooltipProps } from "@dub/ui";
import { Crown } from "lucide-react";

/**
 * A dynamic badge/icon w/ tooltip based on the workspace plan:
 *
 * For a free or Pro workspace: a "Business" badge
 * For a Business workspace: an info icon (question mark circle)
 */
export function BusinessBadgeTooltip(props: Omit<TooltipProps, "children">) {
  const { plan } = useWorkspace();

  return ["free", "pro"].includes(plan!) ? (
    <BadgeTooltip {...props}>
      <div className="flex items-center space-x-1">
        <Crown size={12} />
        <p className="uppercase">Business</p>
      </div>
    </BadgeTooltip>
  ) : (
    <InfoTooltip {...props} />
  );
}
