import { EnrolledPartnerProps, RewardProps } from "@/lib/types";
import { ChevronRight, Users } from "@dub/ui/icons";
import { cn, pluralize } from "@dub/utils";
import { motion } from "framer-motion";
import { useState } from "react";
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
  const { control, setValue } = useAddEditRewardForm();

  const [event, includedPartnerIds, excludedPartnerIds] = useWatch({
    control,
    name: ["event", "includedPartnerIds", "excludedPartnerIds"],
  });

  const [isExpanded, setIsExpanded] = useState(!isDefault);

  return (
    <div className="border-border-subtle rounded-xl border bg-white text-sm shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-4 p-2.5 pr-4"
      >
        <div className="text-content-emphasis flex items-center gap-2.5 font-medium">
          <RewardIconSquare icon={Users} />
          {isDefault ? (
            <span>
              To all partners
              {!!excludedPartnerIds?.length && (
                <>
                  , excluding{" "}
                  <strong className="font-semibold">
                    {excludedPartnerIds.length}
                  </strong>{" "}
                  {pluralize("partner", excludedPartnerIds.length)}
                </>
              )}
            </span>
          ) : (
            <span>
              To {includedPartnerIds?.length || 0}{" "}
              {pluralize("partner", includedPartnerIds?.length || 0)}
            </span>
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
