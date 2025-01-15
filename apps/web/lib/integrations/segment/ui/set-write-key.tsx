"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { SegmentIntegrationCredentials, SegmentRegion } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import { Button, InfoTooltip, Tooltip, TooltipContent } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { installSegmentAction } from "../install";
import { segmentRegions } from "../utils";

export function SetWriteKey({
  credentials,
  installed,
}: {
  credentials: SegmentIntegrationCredentials;
  installed: boolean;
}) {
  const { id: workspaceId, slug, plan } = useWorkspace();
  const [writeKey, setWriteKey] = useState(credentials?.writeKey);
  const [region, setRegion] = useState(credentials?.region || "us-west-2");

  const { executeAsync, isExecuting } = useAction(installSegmentAction, {
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
      region,
    });
  };

  const planDisabledTooltip = (
    <TooltipContent
      title="You can only install the Segment integration on the Business plan and above."
      cta="Upgrade to Business"
      href={`/${slug}/upgrade`}
    />
  );

  const canInstall = !["free", "pro"].includes(plan || "");

  return (
    <form className="mt-4 flex items-end gap-2" onSubmit={onSubmit}>
      <div className="w-full rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
          <Lock className="size-4" />
          <p className="text-sm font-medium text-gray-700">Configure Segment</p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label htmlFor="writeKey" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">Write key</h2>
              <InfoTooltip content="The write key is used to send events to Segment." />
            </label>

            {!canInstall ? (
              <Tooltip content={planDisabledTooltip}>
                <div className="mt-1 cursor-not-allowed rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                  Enter your write key
                </div>
              </Tooltip>
            ) : (
              <div className="relative mt-1 rounded-md shadow-sm">
                <input
                  className={cn(
                    "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                    {
                      "cursor-not-allowed bg-gray-50": !canInstall,
                    },
                  )}
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

          <div>
            <label htmlFor="region" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">
                Select the region
              </h2>
              <InfoTooltip content="Choose the data region where your events will be sent." />
            </label>

            <div className="mt-2 space-y-2">
              {segmentRegions.map(({ name, value }) => (
                <div key={value} className="flex items-center">
                  <input
                    type="radio"
                    name="region"
                    value={value}
                    checked={region === value}
                    onChange={() => setRegion(value as SegmentRegion)}
                    className="h-4 w-4 cursor-pointer rounded-full border-gray-300 text-black focus:outline-none focus:ring-0"
                    disabled={!canInstall || installed}
                  />
                  <label htmlFor={value} className="ml-2 text-sm text-gray-700">
                    {name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-500">
            <a
              href="https://segment.com/docs/connections/find-writekey/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 underline underline-offset-4 hover:text-gray-700"
            >
              Learn about
            </a>{" "}
            how to locate your write key on Segment.
          </p>

          <div className="shrink-0">
            <Button
              type="submit"
              variant="primary"
              text="Save changes"
              className="h-8 w-fit"
              loading={isExecuting}
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
