import { CircleArrowRight, Tooltip } from "@dub/ui";
import { useParams } from "next/navigation";

export function ExternalPayoutsIndicator({
  side = "top",
}: {
  side?: "top" | "left";
}) {
  const { slug } = useParams();

  return (
    <Tooltip
      content={`This payout will be processed externally via the \`payout.confirmed\` [webhook event](${`/${slug}/settings/webhooks`}). [Learn more about external payouts](http://dub.co/docs/partners/external-payouts).`}
      side={side}
    >
      <CircleArrowRight className="size-3.5 text-purple-800" />
    </Tooltip>
  );
}
