import { GroupWithProgramProps } from "@/lib/types";
import { cn } from "@dub/utils";

export function LanderHero({
  group,
  preview,
}: {
  group: GroupWithProgramProps;
  preview?: boolean;
}) {
  const Heading = preview ? "div" : "h1";

  return (
    <div className="grid grid-cols-1 gap-5 py-6 sm:mt-14">
      <span
        className={cn(
          "font-mono text-xs font-medium uppercase text-[var(--brand)]",
          "animate-slide-up-fade [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        {group.program.name || "Affiliate Program"}
      </span>
      <Heading
        className={cn(
          "text-4xl font-semibold",
          "animate-slide-up-fade [--offset:5px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        {group.applicationFormData?.title || `Join the ${group.program.name} affiliate program`}
      </Heading>
      <p
        className={cn(
          "text-base text-neutral-700",
          "animate-slide-up-fade [--offset:5px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        {group.applicationFormData?.description ||
          `Share ${group.program.name} with your audience and for each subscription generated through your referral, you'll earn a share of the revenue on any plans they purchase.`}
      </p>
    </div>
  );
}
