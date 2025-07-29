import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps, RewardProps } from "@/lib/types";
import { ChevronRight, Users } from "@dub/ui/icons";
import { cn, OG_AVATAR_URL, pluralize } from "@dub/utils";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { useAddEditRewardForm } from "./add-edit-reward-sheet";
import { RewardIconSquare } from "./reward-icon-square";
import { RewardPartnersTable } from "./reward-partners-table";

export function RewardPartnersCard({
  isDefault,
  rewardPartners,
  isLoadingRewardPartners,
  reward,
}: {
  isDefault?: boolean;
  rewardPartners?: EnrolledPartnerProps[];
  isLoadingRewardPartners: boolean;
  reward?: RewardProps;
}) {
  const { control, setValue, getValues } = useAddEditRewardForm();

  const { event, includedPartnerIds, excludedPartnerIds } = {
    ...useWatch({
      control,
    }),
    ...getValues(),
  };

  const [isExpanded, setIsExpanded] = useState<boolean | null>(
    isDefault ? false : null,
  );

  // Once everything's loaded, expand the card if it's not a default reward and has no partners selected
  useEffect(() => {
    if (isExpanded !== null || isLoadingRewardPartners) return;

    setIsExpanded(!isDefault && !rewardPartners?.length);
  }, [isExpanded, isLoadingRewardPartners, isDefault, rewardPartners]);

  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        disabled={isExpanded === null}
        className="flex w-full items-center justify-between gap-4 p-2.5 pr-4"
      >
        <div className="text-content-emphasis flex items-center gap-2.5 font-medium">
          <RewardIconSquare icon={Users} />
          {isExpanded === null ? (
            <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <>
              {isDefault ? (
                <span>
                  To all partners
                  {!!excludedPartnerIds?.length && (
                    <>
                      , excluding{" "}
                      <PartnerPreviewOrCount
                        ids={excludedPartnerIds}
                        rewardPartners={rewardPartners}
                        isExpanded={isExpanded}
                      />
                    </>
                  )}
                </span>
              ) : (
                <span>
                  To{" "}
                  <PartnerPreviewOrCount
                    ids={includedPartnerIds || []}
                    rewardPartners={rewardPartners}
                    isExpanded={isExpanded}
                  />
                </span>
              )}
            </>
          )}
        </div>
        <ChevronRight
          className={cn(
            "text-content-subtle size-3 transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      </button>
      <motion.div
        className={cn(
          "overflow-hidden transition-opacity duration-200",
          !isExpanded && "opacity-0",
        )}
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0 }}
        transition={{ duration: 0.2 }}
        {...{
          inert: isExpanded ? undefined : "",
        }}
      >
        <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-50 p-2.5">
          <div className="space-y-4">
            <RewardPartnersTable
              event={event}
              rewardId={reward?.id}
              partnerIds={
                (isDefault ? excludedPartnerIds : includedPartnerIds) || []
              }
              setPartnerIds={(value: string[]) => {
                if (isDefault) setValue("excludedPartnerIds", value);
                else setValue("includedPartnerIds", value);
              }}
              rewardPartners={rewardPartners || []}
              loading={isLoadingRewardPartners}
              mode={isDefault ? "exclude" : "include"}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PartnerPreviewOrCount({
  ids,
  rewardPartners,
  isExpanded,
}: {
  ids: string[];
  rewardPartners?: EnrolledPartnerProps[];
  isExpanded: boolean;
}) {
  const count = ids.length;
  const showAvatars = !isExpanded && count > 0;

  const firstThreeIds = ids.slice(0, 3);
  const partnerIdsToFetch = firstThreeIds.filter(
    (id) => !rewardPartners?.find((p) => p.id === id),
  );

  const { partners } = usePartners({
    query: {
      partnerIds: partnerIdsToFetch,
    },
    enabled: partnerIdsToFetch.length > 0,
  });

  const previewPartners = useMemo(
    () =>
      firstThreeIds.map((id) => {
        const partner = [...(rewardPartners || []), ...(partners || [])].find(
          (p) => p.id === id,
        );

        return partner
          ? {
              id,
              image: partner.image || `${OG_AVATAR_URL}${partner.name}`,
              name: partner.name,
            }
          : {
              id,
              image: OG_AVATAR_URL,
              name: "Partner",
            };
      }),
    [firstThreeIds, rewardPartners, partners],
  );

  return (
    <span className="relative">
      <span
        className={cn(
          "transition-[transform,opacity] duration-200",
          showAvatars && "pointer-events-none -translate-y-0.5 opacity-0",
        )}
      >
        <strong className="font-semibold">{count}</strong>{" "}
        {pluralize("partner", count)}
      </span>

      <span
        className={cn(
          "absolute left-2 top-1/2 inline-flex -translate-y-1/2 items-center align-text-top transition-[transform,opacity] duration-200",
          !showAvatars && "pointer-events-none translate-y-0.5 opacity-0",
        )}
      >
        {previewPartners.map(({ id, name, image }) => (
          <img
            key={id}
            src={image}
            alt={`${name} avatar`}
            title={name}
            className="-ml-1.5 size-[1.125rem] shrink-0 rounded-full border border-white"
          />
        ))}
        {count > 3 && (
          <span className="text-content-subtle ml-1 text-xs">+{count - 3}</span>
        )}
      </span>
    </span>
  );
}
