import { dotsPayoutPlatforms } from "@/lib/dots/schemas";
import z from "@/lib/zod";
import { DOTS_PAYOUT_PLATFORMS } from "@/ui/dots/platforms";
import { StatusBadge } from "@dub/ui";
import { cn } from "@dub/utils";

export default function PayoutMethodCard({
  platform,
  isDefault,
}: {
  platform: z.infer<typeof dotsPayoutPlatforms>;
  isDefault?: boolean;
}) {
  const {
    icon: Icon,
    name,
    iconBgColor,
    duration,
  } = DOTS_PAYOUT_PLATFORMS.find((p) => p.id === platform) ||
  DOTS_PAYOUT_PLATFORMS[0];

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            iconBgColor,
          )}
        >
          <Icon className="size-4 text-neutral-700" />
        </div>
        <div>
          <p className="font-medium text-neutral-900">{name}</p>
          <p className="text-sm text-neutral-500">
            Typically arrives {duration}
          </p>
        </div>
      </div>
      {isDefault && (
        <StatusBadge variant="success" icon={null}>
          Default
        </StatusBadge>
      )}
    </div>
  );
}

export function PayoutMethodCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-200" />
        <div className="h-4 w-24 min-w-0 animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}
