import useWorkspace from "@/lib/swr/use-workspace";
import { BadgeTooltip, InfoTooltip, type TooltipProps } from "@dub/ui";
import { Crown } from "lucide-react";

/**
 * A dynamic badge/icon w/ tooltip based on the workspace plan:
 *
 * For a free workspace: a "Pro" badge
 * For a Pro workspace: an info icon (question mark circle)
 */
export function ProBadgeTooltip(props: Omit<TooltipProps, "children">) {
  const { plan } = useWorkspace();

  return plan === "free" ? (
    <BadgeTooltip {...props}>
      <div className="flex items-center space-x-1">
        <Crown size={12} />
        <p className="uppercase">Pro</p>
      </div>
    </BadgeTooltip>
  ) : (
    <InfoTooltip {...props} />
  );
}
