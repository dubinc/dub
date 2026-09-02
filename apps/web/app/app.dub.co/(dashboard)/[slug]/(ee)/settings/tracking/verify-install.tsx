"use client";

import { verifyWorkspaceSetup } from "@/lib/actions/verify-workspace-setup";
import {
  toVerifySiteUrl,
  type VerifyInstallationResult,
} from "@/lib/analytics/verify-installation";
import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { UserAvatar } from "@/ui/users/user-avatar";
import { Button, Combobox, Globe } from "@dub/ui";
import { cn, OG_AVATAR_URL, timeAgo } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const HOSTNAME_REQUIRED_MESSAGE =
  "A hostname is required in order to verify installation.";

const VERIFY_DOCS_HREF = "https://dub.co/docs/sdks/client-side";
const VERIFY_SUPPORT_HREF = "https://dub.co/support";

const ERROR_HEADLINE = {
  not_installed: "Script is not installed.",
  missing_attributes: "Script missing attributes.",
  duplicate: "Duplicate script.",
  malformed: "Malformed script.",
  unreachable: "We couldn’t reach this hostname.",
  unsupported: "Wildcard hostnames can’t be verified.",
};

type LastVerified = {
  hostname: string;
  verifiedAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type HelperTone = "success" | "error" | "neutral";

export function VerifyInstall({ hostnames }: { hostnames: string[] }) {
  const { id: workspaceId, role, store, mutate } = useWorkspace();
  const [selectedHostname, setSelectedHostname] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyInstallationResult | null>(null);
  const selectedHostnameRef = useRef(selectedHostname);
  const pendingHostnameRef = useRef<string | null>(null);
  selectedHostnameRef.current = selectedHostname;

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "verify tracking installation",
  }).error;
  const disabledTooltip =
    typeof permissionsError === "string"
      ? permissionsError
      : !selectedHostname
        ? HOSTNAME_REQUIRED_MESSAGE
        : undefined;

  const lastVerified = store?.analyticsSettingsInstallationVerified as
    | LastVerified
    | undefined;

  const hostnameOptions = useMemo(
    () =>
      hostnames.map((hostname) => ({
        value: hostname,
        label: hostname.startsWith("*.") ? hostname : toVerifySiteUrl(hostname),
        icon: <Globe className="size-4 text-neutral-600" />,
      })),
    [hostnames],
  );

  const selectedOption =
    hostnameOptions.find((option) => option.value === selectedHostname) ?? null;

  const persistedForHostname =
    selectedHostname && lastVerified?.hostname === selectedHostname
      ? lastVerified
      : null;

  const resultForSelection =
    result && result.hostname === selectedHostname ? result : null;
  const showSuccess = resultForSelection?.status === "success";
  const showError = resultForSelection?.status === "error";
  const showLastVerified = !resultForSelection && Boolean(persistedForHostname);
  const canReverify = showSuccess || showLastVerified;

  const helperTone: HelperTone | null = showSuccess
    ? "success"
    : showError
      ? "error"
      : showLastVerified
        ? "neutral"
        : null;

  const { executeAsync, isPending } = useAction(verifyWorkspaceSetup, {
    onSuccess({ data }) {
      if (!data) {
        return;
      }

      if (data.status === "success") {
        void mutate();
      }

      if (data.hostname !== selectedHostnameRef.current) {
        return;
      }

      setResult(data);
    },
    onError({ error }) {
      const hostname = pendingHostnameRef.current;

      if (!hostname || hostname !== selectedHostnameRef.current) {
        return;
      }

      setResult({
        status: "error",
        hostname,
        error: "unreachable",
      });
      toast.error(error.serverError || "Failed to verify installation.");
    },
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        className={cn(
          "flex w-full flex-col",
          helperTone && "gap-1.5 rounded-[10px] px-0.5 pb-1.5 pt-0.5",
          helperTone === "success" && "bg-[#DCFCE7]",
          helperTone === "error" && "bg-[#FFE2E2]",
          helperTone === "neutral" && "bg-neutral-100",
        )}
      >
        <Combobox
          caret
          options={hostnameOptions}
          selected={selectedOption}
          setSelected={(option) => {
            setSelectedHostname(option?.value ?? null);
            setResult(null);
          }}
          placeholder="Select hostname"
          searchPlaceholder="Search hostnames..."
          buttonProps={{
            className: cn("h-10 w-full", helperTone && "bg-bg-default"),
            disabled: hostnames.length === 0 || isPending,
            disabledTooltip:
              hostnames.length === 0
                ? HOSTNAME_REQUIRED_MESSAGE
                : isPending
                  ? "Verification in progress"
                  : undefined,
          }}
          matchTriggerWidth
        />

        {showSuccess && (
          <HelperText tone="success">
            Successfully connected and ready to use.
          </HelperText>
        )}

        {showError && resultForSelection?.status === "error" && (
          <HelperText tone="error">
            {ERROR_HEADLINE[resultForSelection.error]} After correcting, try
            verifying again and if the issue still persists, check out our{" "}
            <a
              href={VERIFY_DOCS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              docs
            </a>{" "}
            or{" "}
            <a
              href={VERIFY_SUPPORT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              contact support
            </a>
            .
          </HelperText>
        )}

        {showLastVerified && persistedForHostname && (
          <HelperText tone="neutral" inline>
            Last verified by
            <UserAvatar
              user={{
                id: persistedForHostname.user.id,
                name: persistedForHostname.user.name,
                image:
                  persistedForHostname.user.image ??
                  `${OG_AVATAR_URL}${persistedForHostname.user.id}`,
              }}
              className="size-4 border-neutral-200"
            />
            <span className="font-medium">
              {persistedForHostname.user.name}
            </span>
            {timeAgo(new Date(persistedForHostname.verifiedAt), {
              withAgo: true,
            })}
          </HelperText>
        )}
      </div>

      <Button
        text={canReverify ? "Verify again" : "Verify installation"}
        className="h-8 w-fit px-3"
        loading={isPending}
        disabled={!workspaceId || Boolean(disabledTooltip)}
        disabledTooltip={disabledTooltip}
        onClick={() => {
          if (!workspaceId || !selectedHostname) {
            return;
          }

          pendingHostnameRef.current = selectedHostname;
          void executeAsync({ workspaceId, hostname: selectedHostname });
        }}
      />
    </div>
  );
}

function HelperText({
  tone,
  inline = false,
  children,
}: {
  tone: HelperTone;
  inline?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "min-h-5 px-3 text-sm leading-5",
        inline && "flex flex-wrap items-center gap-2",
        tone === "success" && "text-[#0D542B]",
        tone === "error" && "text-[#82181A]",
        tone === "neutral" && "text-content-subtle",
      )}
    >
      {children}
    </p>
  );
}
