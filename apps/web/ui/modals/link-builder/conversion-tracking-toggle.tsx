import useWorkspace from "@/lib/swr/use-workspace";
import {
  CrownSmall,
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
  Tooltip,
  useKeyboardShortcut,
} from "@dub/ui";
import { PropsWithChildren } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

// Show new badge for 30 days
const isNew =
  new Date().getTime() - new Date("2025-01-13").getTime() < 30 * 86_400_000;

export function ConversionTrackingToggle() {
  const { plan } = useWorkspace();
  const { watch, setValue } = useFormContext<LinkFormData>();

  const conversionsEnabled = !!plan && plan !== "free" && plan !== "pro";

  const trackConversion = watch("trackConversion");

  useKeyboardShortcut(
    "c",
    () => setValue("trackConversion", !trackConversion),
    { modal: true, enabled: conversionsEnabled },
  );

  return (
    <label className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isNew && (
          <div className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-[0.625rem] uppercase leading-none text-green-900">
            New
          </div>
        )}
        <span className="flex select-none items-center gap-1 text-sm font-medium text-gray-700">
          Conversion Tracking
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
      <DisabledTooltip disabled={!conversionsEnabled}>
        <Switch
          checked={trackConversion}
          fn={(checked) =>
            setValue("trackConversion", checked, {
              shouldDirty: true,
            })
          }
          disabled={!conversionsEnabled}
          thumbIcon={
            conversionsEnabled ? undefined : (
              <CrownSmall className="size-full text-neutral-500" />
            )
          }
        />
      </DisabledTooltip>
    </label>
  );
}

function DisabledTooltip({
  children,
  disabled,
}: PropsWithChildren<{ disabled: boolean }>) {
  return disabled ? (
    <Tooltip content="Requires a Dub Business Plan to enable">
      <div>{children}</div>
    </Tooltip>
  ) : (
    children
  );
}
