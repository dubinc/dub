"use client";

import { verifyWorkspaceSetup } from "@/lib/actions/verify-workspace-setup";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Combobox, Globe } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const HOSTNAME_REQUIRED_MESSAGE =
  "A hostname is required in order to verify installation.";

export function VerifyInstall({ hostnames }: { hostnames: string[] }) {
  const { id: workspaceId } = useWorkspace();
  const [selectedHostname, setSelectedHostname] = useState<string | null>(null);

  const hostnameOptions = useMemo(
    () =>
      hostnames.map((hostname) => ({
        value: hostname,
        label: hostname,
        icon: <Globe className="size-4 text-neutral-600" />,
      })),
    [hostnames],
  );

  const selectedOption =
    hostnameOptions.find((option) => option.value === selectedHostname) ?? null;

  const { executeAsync, isPending } = useAction(verifyWorkspaceSetup, {
    onSuccess() {
      toast.success("Installation verified.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to verify installation.");
    },
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <Combobox
        options={hostnameOptions}
        selected={selectedOption}
        setSelected={(option) => setSelectedHostname(option?.value ?? null)}
        placeholder="Select hostname"
        searchPlaceholder="Search hostnames..."
        buttonProps={{
          className: "w-full",
          disabled: hostnames.length === 0,
          disabledTooltip:
            hostnames.length === 0 ? HOSTNAME_REQUIRED_MESSAGE : undefined,
        }}
        matchTriggerWidth
      />
      <Button
        text="Verify installation"
        className="h-9 w-full"
        loading={isPending}
        disabled={!workspaceId}
        onClick={() => {
          if (!workspaceId) {
            return;
          }

          if (!selectedHostname) {
            toast.error(HOSTNAME_REQUIRED_MESSAGE);
            return;
          }

          void executeAsync({ workspaceId });
        }}
      />
    </div>
  );
}
