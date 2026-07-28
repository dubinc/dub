"use client";

import { PartnerGroupsSelect } from "@/ui/partners/groups/partner-groups-select";
import { PartnerTagsSelect } from "@/ui/partners/partner-tags-select";
import { Controller } from "react-hook-form";
import { useBountyFormContext } from "./bounty-form-context";

export function AudienceEligibilityPanel() {
  const { control } = useBountyFormContext();

  return (
    <div className="flex flex-col gap-6">
      <Controller
        control={control}
        name="groupIds"
        render={({ field }) => (
          <PartnerGroupsSelect
            selectedGroupIds={field.value}
            setSelectedGroupIds={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="partnerTagIds"
        render={({ field }) => (
          <PartnerTagsSelect
            selectedPartnerTagIds={field.value ?? null}
            setSelectedPartnerTagIds={field.onChange}
          />
        )}
      />
    </div>
  );
}
