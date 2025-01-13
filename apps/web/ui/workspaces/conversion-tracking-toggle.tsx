"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { SquareChart, Switch } from "@dub/ui";
import { ComponentProps, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export function ConversionTrackingToggle() {
  const id = useId();

  const { plan } = useWorkspace();
  const enabled = plan !== "free" && plan !== "pro";

  return enabled ? (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="hidden rounded-md border border-gray-200 p-2 sm:block">
          <SquareChart className="size-5" />
        </div>
        <div className="overflow-hidden">
          <label
            htmlFor={`${id}-switch`}
            className="block text-pretty text-sm font-medium"
          >
            Enable conversion tracking for future links
          </label>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            This only affects links made with the link builder.
          </p>
        </div>
      </div>
      <ConversionTrackingToggleSwitch id={`${id}-switch`} />
    </div>
  ) : null;
}

export function ConversionTrackingToggleSwitch(
  props: ComponentProps<typeof Switch>,
) {
  const {
    slug: workspaceSlug,
    role,
    conversionEnabled: workspaceConversionEnabled,
  } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  const [conversionEnabled, setConversionEnabled] = useState(
    workspaceConversionEnabled,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setConversionEnabled(workspaceConversionEnabled);
  }, [workspaceConversionEnabled]);

  return (
    <Switch
      disabled={isSubmitting}
      disabledTooltip={permissionsError}
      checked={conversionEnabled}
      fn={(checked) => {
        const oldConversionEnabled = conversionEnabled;
        setConversionEnabled(checked);
        setIsSubmitting(true);
        fetch(`/api/workspaces/${workspaceSlug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ conversionEnabled: checked }),
        })
          .then(async (res) => {
            if (res.ok) {
              toast.success(
                `Conversion tracking for new links ${checked ? "enabled" : "disabled"}.`,
              );
              await mutate(`/api/workspaces/${workspaceSlug}`);
            } else {
              const { error } = await res.json();
              toast.error(error.message);
              setConversionEnabled(oldConversionEnabled);
            }
          })
          .finally(() => setIsSubmitting(false));
      }}
      {...props}
    />
  );
}
