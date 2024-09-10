"use client";

import { createDotsAppAction } from "@/lib/actions/create-dots-app";
import { generateDotsComplianceFlowAction } from "@/lib/actions/generate-dots-compliance-flow";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export const ConnectDotsApp = () => {
  const { id, dotsAppId } = useWorkspace();

  const createDotsApp = useAction(createDotsAppAction, {
    onSuccess: () => {
      toast.success("Payout settings enabled successfully.");
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
    },
  });

  const generateURL = useAction(generateDotsComplianceFlowAction, {
    onSuccess: () => {
     // Redirect to the URL
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
    },
  });

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Payout settings </h2>
            <p className="text-sm text-gray-500">
              Manage payout settings for your workspace.
            </p>
          </div>

          {dotsAppId ? (
            <div className="w-fit">
              <Button
                text="Update your KYB info"
                onClick={() => {
                  generateURL.execute({ workspaceId: id! });
                }}
              />
            </div>
          ) : (
            <div className="w-fit">
              <Button
                text="Enable Payout"
                onClick={() => {
                  createDotsApp.execute({ workspaceId: id! });
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-3 py-5 sm:px-10">
          <a
            href="https://dub.co/help/article/how-to-get-workspace-id"
            target="_blank"
            className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-700"
          >
            Learn more about Workspace ID
          </a>
        </div>
      </div>
    </>
  );
};
