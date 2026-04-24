"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { useSyncedLocalStorage } from "@/lib/hooks/use-synced-local-storage";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { Button, Grid } from "@dub/ui";
import { SlackColorful } from "@dub/ui/icons";
import { cn, isWorkspaceBillingTrialActive } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export function SlackSupportSettingsCard() {
  const { slug, plan, role, loading, trialEndsAt } = useWorkspace();
  const [inviting, setInviting] = useState(false);

  const [dismissed, setDismissed] = useSyncedLocalStorage<boolean>(
    slug ? `slack-support-dismissed:${slug}` : "__none__",
    false,
  );

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  if (
    loading ||
    !slug ||
    dismissed ||
    permissionsError ||
    !getPlanCapabilities(plan).canRequestSlackSupportInvite ||
    isWorkspaceBillingTrialActive(trialEndsAt)
  ) {
    return null;
  }

  const requestInvite = async () => {
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${slug}/support/slack-invite`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not send Slack invite.");
        if (json?.error?.code === "conflict") {
          setDismissed(true);
        }
        return;
      }

      toast.success(
        "Check your email for your Slack Connect invitation to our team.",
      );
      setDismissed(true);
    } finally {
      setInviting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "border-border-subtle relative overflow-hidden rounded-xl border bg-gradient-to-r from-[#F5F3FF] via-white to-[#FDF2FA]",
          "sm:h-12 sm:max-h-12",
        )}
      >
        <div
          className="pointer-events-none absolute -left-8 top-1/2 hidden h-20 w-36 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#DDD6FE]/50 via-[#E9D5FF]/35 to-transparent blur-2xl sm:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-4 top-8 h-24 w-28 rounded-full bg-gradient-to-r from-[#DDD6FE]/40 via-[#E9D5FF]/25 to-transparent blur-2xl sm:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 top-1/2 hidden h-20 w-44 -translate-y-1/2 rounded-full bg-gradient-to-l from-[#F0ABFC]/60 from-5% via-[#E9D5FF]/45 via-40% to-transparent blur-3xl sm:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-2 -right-4 h-28 w-36 rounded-full bg-gradient-to-tl from-[#F0ABFC]/45 via-[#E9D5FF]/30 to-transparent blur-3xl sm:hidden"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0">
          <Grid
            cellSize={56}
            strokeWidth={1}
            patternOffset={[-8, -12]}
            className="text-neutral-400/10"
          />
        </div>

        <div className="relative flex h-full flex-col justify-between px-4 pb-4 sm:flex-row sm:items-center sm:pb-0 sm:pl-4 sm:pr-3">
          <div className="flex min-w-0 flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:gap-3 sm:pt-0">
            <div className="shrink-0">
              <div className="flex justify-start">
                <SlackColorful
                  width={24}
                  height={24}
                  className="size-6 shrink-0"
                  aria-hidden
                />
              </div>
            </div>

            <p
              className="text-content-default flex min-w-0 flex-col text-sm sm:block sm:flex-1 sm:truncate sm:text-base"
              title="Priority Slack support. Request an invite and get direct access to our team."
            >
              <span className="font-semibold text-neutral-900">
                Priority Slack support.
              </span>{" "}
              <span className="text-content-subtle font-normal">
                Request an invite and get direct access to our team.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-3 sm:pl-2 sm:pt-0">
            <button
              type="button"
              disabled={inviting}
              onClick={requestInvite}
              className={cn(
                "flex h-8 items-center justify-center whitespace-nowrap rounded-lg bg-neutral-950 px-3 text-sm font-medium text-white",
                "outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-neutral-950/30",
                "disabled:opacity-50 sm:h-7 sm:rounded-md sm:px-2.5 sm:text-xs",
              )}
            >
              {inviting ? "Sending…" : "Request invite"}
            </button>

            <Button
              variant="outline"
              icon={<X className="size-4" />}
              className="hidden size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:flex"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
            />
          </div>
        </div>

        <Button
          variant="outline"
          icon={<X className="size-4" />}
          className="absolute right-2 top-2 size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:hidden"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        />
      </motion.div>
    </AnimatePresence>
  );
}
