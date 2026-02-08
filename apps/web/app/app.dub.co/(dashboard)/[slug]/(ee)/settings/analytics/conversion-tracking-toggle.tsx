"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  CrownSmall,
  Switch,
  Tooltip,
  TooltipContent,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export function ConversionTrackingToggle() {
  const {
    slug: workspaceSlug,
    plan,
    role,
    conversionEnabled: workspaceConversionEnabled,
  } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription:
      "manage workspace-level conversion tracking settings",
  }).error;

  const [conversionEnabled, setConversionEnabled] = useState(
    workspaceConversionEnabled,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setConversionEnabled(workspaceConversionEnabled);
  }, [workspaceConversionEnabled]);

  const handleConversionUpdate = async (checked: boolean) => {
    const oldConversionEnabled = conversionEnabled;
    setConversionEnabled(checked);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversionEnabled: checked }),
      });

      if (res.ok) {
        toast.success(
          `Workspace-level conversion tracking ${checked ? "enabled" : "disabled"}.`,
        );
        await mutate(`/api/workspaces/${workspaceSlug}`);
      } else {
        const { error } = await res.json();
        toast.error(error.message);
        setConversionEnabled(oldConversionEnabled);
      }
    } catch (error) {
      toast.error("Failed to update conversion tracking");
      setConversionEnabled(oldConversionEnabled);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { canTrackConversions } = getPlanCapabilities(plan);

  const { isMobile } = useMediaQuery();

  if (isMobile) return null;

  return (
    <Tooltip
      content={
        !canTrackConversions ? (
          <TooltipContent
            title="You can only enable conversion tracking on Business plans and above."
            cta="Upgrade to Business"
            href={`/${workspaceSlug}/upgrade`}
          />
        ) : (
          permissionsError || (
            <p className="text-content-default max-w-xs p-3 text-xs">
              <strong className="font-semibold">
                Workspace-level conversion tracking is{" "}
                {conversionEnabled ? "on" : "off"}
              </strong>{" "}
              - This enables conversion tracking for all future links created
              via the link builder.
            </p>
          )
        )
      }
      align="end"
    >
      <label
        className={cn(
          "bg-bg-subtle text-content-default border-border-subtle flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3",
          "transition-colors duration-100 ease-out",
          conversionEnabled &&
            "bg-bg-inverted text-content-inverted border-bg-inverted",
          (!canTrackConversions || permissionsError) &&
            "cursor-not-allowed opacity-50",
        )}
      >
        <span className="text-sm font-medium">Conversion tracking</span>
        <Switch
          checked={conversionEnabled}
          disabled={isSubmitting || !canTrackConversions || !!permissionsError}
          fn={handleConversionUpdate}
          trackDimensions="radix-state-checked:bg-neutral-600 focus-visible:ring-black/20"
          thumbIcon={
            !canTrackConversions ? (
              <CrownSmall className="size-full text-neutral-500" />
            ) : undefined
          }
        />
      </label>
    </Tooltip>
  );
}
