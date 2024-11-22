"use client";

import { createPublishableKey } from "@/lib/actions/create-publishable-key";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, CopyButton } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export const WorkspacePublicKey = () => {
  const { id, slug, publishableKey } = useWorkspace();

  const [publicKey, setPublicKey] = useState<string | null>(
    publishableKey || null,
  );

  const { executeAsync, isExecuting } = useAction(createPublishableKey, {
    onSuccess({ data }) {
      toast.success("Publishable key created successfully.");

      if (data?.publishableKey) {
        setPublicKey(data.publishableKey);
      }

      mutate(`/api/workspaces/${slug}`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Publishable Key</h2>
            <p className="text-sm text-gray-500">
              This key can be safely used in your client-side code (for
              client-side click-tracking).
            </p>
          </div>

          {publicKey ? (
            <div className="flex w-full max-w-md items-center justify-between rounded-md border border-gray-300 bg-white p-2">
              <p className="text-sm text-gray-500">{publicKey}</p>
              <CopyButton value={publicKey} className="rounded-md" />
            </div>
          ) : (
            <Button
              text={isExecuting ? "Creating..." : "Create publishable key"}
              loading={isExecuting}
              className="w-fit"
              onClick={() => executeAsync({ workspaceId: id! })}
            />
          )}
        </div>
      </div>
    </>
  );
};
