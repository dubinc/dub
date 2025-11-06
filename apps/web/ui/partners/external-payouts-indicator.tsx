import { Button, CircleArrowRight, Tooltip } from "@dub/ui";
import { useParams } from "next/navigation";

export function ExternalPayoutsIndicator({
  side = "top",
}: {
  side?: "top" | "left";
}) {
  const { slug } = useParams();

  return (
    <Tooltip
      content={
        <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-700">
          This payout will be processed externally via the{" "}
          <code className="rounded-md bg-neutral-100 px-1 py-0.5 font-mono">
            payout.confirmed
          </code>{" "}
          <a
            href={`/${slug}/settings/webhooks`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-alias underline decoration-dotted underline-offset-2"
          >
            webhook event.
          </a>
          <a
            href="http://dub.co/docs/partners/external-payouts"
            target="_blank"
          >
            <Button text="Learn more" className="mt-2 h-7 px-3" />
          </a>
        </div>
      }
      side={side}
    >
      <CircleArrowRight className="size-3.5 text-purple-800" />
    </Tooltip>
  );
}
