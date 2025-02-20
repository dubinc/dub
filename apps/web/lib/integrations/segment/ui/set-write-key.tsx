"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SegmentIntegrationCredentials } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import { Button, Tooltip, TooltipContent } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { installSegmentAction } from "../install";

export function SetWriteKey({
  credentials,
  installed,
}: {
  credentials: SegmentIntegrationCredentials;
  installed: boolean;
}) {
  const { id: workspaceId, slug, plan } = useWorkspace();
  const [writeKey, setWriteKey] = useState(credentials?.writeKey);

  const { executeAsync, isPending } = useAction(installSegmentAction, {
    async onSuccess() {
      toast.success("Segment integration enabled successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to enable Segment integration.");
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspaceId) {
      return;
    }

    if (!writeKey) {
      toast.error("Write key is required.");
      return;
    }

    await executeAsync({
      workspaceId,
      writeKey,
    });
  };

  const planDisabledTooltip = (
    <TooltipContent
      title="You can only install the Segment integration on the Business plan and above."
      cta="Upgrade to Business"
      href={`/${slug}/upgrade`}
    />
  );

  return (
    <form className="mt-4 flex items-end gap-2" onSubmit={onSubmit}>
      <div className="w-full rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-6 py-4">
          <Lock className="size-4" />
          <p className="text-sm font-medium text-neutral-700">Write key</p>
        </div>

        <div className="p-4">
          <p className="text-sm leading-normal text-neutral-600">
            To send click events to Segment, you need to add your Segment write
            key below.{" "}
            <a
              href="https://segment.com/docs/connections/find-writekey/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 underline underline-offset-4 hover:text-neutral-700"
            >
              Learn about
            </a>{" "}
            how to locate your write key.
          </p>

          {plan === "free" || plan === "pro" ? (
            <Tooltip content={planDisabledTooltip}>
              <div className="mt-4 cursor-not-allowed rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-400">
                Enter your write key
              </div>
            </Tooltip>
          ) : (
            <div className="relative mt-4 rounded-md shadow-sm">
              <input
                className="w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="Enter your write key"
                required
                type="text"
                autoComplete="off"
                name="writeKey"
                value={writeKey}
                onChange={(e) => setWriteKey(e.target.value)}
                readOnly={installed}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="shrink-0">
            <Button
              type="submit"
              variant="primary"
              text="Save changes"
              className="h-8 w-fit"
              loading={isPending}
              disabled={installed || !writeKey}
              disabledTooltip={
                plan === "free" || plan === "pro"
                  ? planDisabledTooltip
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </form>
  );
}
