import usePartners from "@/lib/swr/use-partners";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { Users } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { RewardIconSquare } from "./reward-icon-square";

export function RewardPartnersCard({ groupId }: { groupId: string }) {
  const { partnersCount, loading: isLoadingPartnersCount } =
    usePartnersCount<number>({ groupId });
  const { partners, loading: isLoadingPartners } = usePartners({
    query: { groupId, pageSize: 3 },
  });

  const isLoading = isLoadingPartnersCount || isLoadingPartners;

  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <div className="flex w-full items-center justify-between gap-4 p-2.5 pr-4">
        <div className="text-content-emphasis flex items-center gap-2.5 font-medium">
          <RewardIconSquare icon={Users} />
          {isLoading ? (
            <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <span className="relative whitespace-nowrap font-medium">
              To {partnersCount} {pluralize("partner", partnersCount ?? 0)}
              <span className="ml-2 inline-flex min-w-full items-center align-text-top">
                {partners?.map(({ id, name, image }, idx) => (
                  <img
                    key={id}
                    src={image || `${OG_AVATAR_URL}${name}`}
                    alt={`${name} avatar`}
                    title={name}
                    className={cn(
                      "size-[1.125rem] shrink-0 rounded-full border border-white",
                      idx > 0 && "-ml-1.5",
                    )}
                  />
                ))}
                {(partnersCount ?? 0) > 3 && (
                  <span className="text-content-subtle ml-1 text-xs">
                    +{partnersCount - 3}
                  </span>
                )}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
