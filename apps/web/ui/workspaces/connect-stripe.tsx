"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CopyButton } from "@dub/ui";
import { Button } from "@dub/ui/src/button";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ConnectStripe() {
  const searchParams = useSearchParams();

  const { id: workspaceId, stripeConnectId } = useWorkspace();

  const [redirecting, setRedirecting] = useState(false);

  const redirectToStripe = async () => {
    setRedirecting(true);
    const response = await fetch(
      `/api/workspaces/${workspaceId}/connect-stripe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { url } = await response.json();

    window.location.href = url;
  };

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setRedirecting(false);
    };
  }, []);

  useEffect(() => {
    if (searchParams.has("stripeConnectError")) {
      toast.error(
        `Error connecting to Stripe: ${searchParams.get("stripeConnectError")}`,
      );
    }
  }, [searchParams]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
        <div className="flex flex-col space-y-3">
          <h2 className="text-xl font-medium">Stripe Integration</h2>
          <p className="text-sm text-gray-500">
            Connect your Stripe account to set up conversion tracking and pay
            out affiliates.
          </p>
        </div>
        {stripeConnectId ? (
          <div className="flex w-full max-w-md items-center justify-between rounded-md border border-gray-300 bg-white p-2">
            <p className="text-sm text-gray-500">{stripeConnectId}</p>
            <CopyButton value={stripeConnectId} className="rounded-md" />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 p-8">
            <p className="text-sm text-gray-500">
              No Stripe account connected yet.
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-3 py-5 sm:px-10">
        <a
          href="https://dub.co/help/article/conversion-tracking"
          target="_blank"
          className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-700"
        >
          Learn more about conversion tracking
        </a>
        <div>
          {stripeConnectId ? (
            <Button
              text="Disconnect Stripe"
              loading={redirecting}
              onClick={redirectToStripe}
            />
          ) : (
            <Button
              text="Connect to Stripe"
              loading={redirecting}
              onClick={redirectToStripe}
            />
          )}
        </div>
      </div>
    </div>
  );
}
