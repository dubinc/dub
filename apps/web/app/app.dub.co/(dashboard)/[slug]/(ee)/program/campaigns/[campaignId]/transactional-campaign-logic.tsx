import {
  ALLOWED_ATTRIBUTE_VALUES_IN_DAYS,
  CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS,
} from "@/lib/zod/schemas/campaigns";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { pluralize } from "@dub/utils";
import { useEffect } from "react";
import { Controller } from "react-hook-form";
import { useCampaignFormContext } from "./campaign-form-context";

export function TransactionalCampaignLogic() {
  const { control, watch, setValue } = useCampaignFormContext();

  const [attribute, value] = watch([
    "triggerCondition.attribute",
    "triggerCondition.value",
  ]);

  useEffect(() => {
    if (!attribute) {
      setValue("triggerCondition.attribute", "partnerEnrolledDays");
    }

    if (value === undefined || value === null) {
      setValue("triggerCondition.value", 1);
    }
  }, [attribute, value, setValue]);

  return (
    <div className="flex h-8 w-full items-center px-2">
      <span className="text-content-default flex gap-1 text-sm font-medium leading-relaxed">
        When partner has
        <div className="inline-flex items-center gap-1">
          <Controller
            control={control}
            name="triggerCondition.attribute"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value
                    ? CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS[field.value]
                    : CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS.partnerEnrolledDays
                }
                invalid={!field.value}
              >
                <InlineBadgePopoverMenu
                  selectedValue={field.value}
                  onSelect={field.onChange}
                  items={Object.entries(CAMPAIGN_WORKFLOW_ATTRIBUTE_LABELS).map(
                    ([key, value]) => ({
                      text: value,
                      value: key,
                    }),
                  )}
                />
              </InlineBadgePopover>
            )}
          />

          <Controller
            control={control}
            name="triggerCondition.value"
            render={({ field }) => (
              <InlineBadgePopover
                text={
                  field.value !== undefined && field.value !== null
                    ? String(field.value)
                    : "1"
                }
                invalid={field.value === undefined || field.value === null}
              >
                <InlineBadgePopoverMenu
                  selectedValue={
                    field.value !== undefined && field.value !== null
                      ? String(field.value)
                      : "1"
                  }
                  onSelect={(val) => field.onChange(Number(val))}
                  items={ALLOWED_ATTRIBUTE_VALUES_IN_DAYS.filter(
                    (days) => days !== 0,
                  ).map((days) => ({
                    text: String(days),
                    value: String(days),
                  }))}
                />
              </InlineBadgePopover>
            )}
          />

          {pluralize("day", value || 1)}
        </div>
      </span>
    </div>
  );
}
