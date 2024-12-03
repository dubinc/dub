"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Lock } from "@/ui/shared/icons";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { installSegmentAction } from "../install";
import { SegmentSettingsProps } from "./types";

export const UpdateWriteKey = ({
  installed,
  credentials,
}: SegmentSettingsProps) => {
  const { id: workspaceId } = useWorkspace();
  const [writeKey, setWriteKey] = useState(credentials?.writeKey);

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
    });
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
        <Lock className="size-4" />
        <p className="text-sm font-medium text-gray-700">
          Configure Segment write key
        </p>
      </div>

      <div className="p-4">
        <p className="text-sm leading-normal text-gray-600">
          To send click events to Segment, you need to add your Segment write
          key below.{" "}
          <a
            href="https://segment.com/docs/connections/find-writekey/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 underline underline-offset-4 hover:text-gray-700"
          >
            Learn about
          </a>{" "}
          how to locate your write key.
        </p>

        <form className="mt-4 flex items-end gap-2" onSubmit={onSubmit}>
          <div className="flex-1">
            <div className="relative rounded-md shadow-sm">
              <input
                className="w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="Enter your write key"
                required
                type="text"
                autoComplete="off"
                name="writeKey"
                value={writeKey}
                onChange={(e) => setWriteKey(e.target.value)}
                readOnly={installed?.id ? true : false}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            text="Enable Segment"
            className="w-fit"
            loading={isExecuting}
            disabled={installed?.id ? true : false || !writeKey}
          />
        </form>
      </div>
    </div>
  );
};
