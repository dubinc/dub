import { InfoTooltip, SimpleTooltipContent, Switch } from "@dub/ui";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

// Show new badge for 30 days
const isNew =
  new Date().getTime() - new Date("2025-01-13").getTime() < 30 * 86_400_000;

export function ConversionTrackingToggle() {
  const { watch, setValue } = useFormContext<LinkFormData>();

  const trackConversion = watch("trackConversion");

  return (
    <label className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex select-none items-center gap-1 text-sm font-medium text-gray-700">
          Enable Conversion Tracking
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="View analytics on conversions from your short links."
                cta="Learn more."
                href="https://dub.co/docs/conversions/quickstart"
              />
            }
          />
        </span>
      </div>
      <Switch
        checked={trackConversion}
        fn={(checked) =>
          setValue("trackConversion", checked, {
            shouldDirty: true,
          })
        }
      />
    </label>
  );
}
