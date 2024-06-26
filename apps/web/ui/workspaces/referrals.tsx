"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui/src/button";
import { useState } from "react";
import { mutate } from "swr";

export default function Referrals() {
  const {
    id: workspaceId,
    stripeConnectId,
    stripeFinancialId,
  } = useWorkspace();
  const [loading, setLoading] = useState(false);

  console.log({ stripeConnectId, stripeFinancialId });

  // Create Treasury Stripe Connect + Financial account
  const createConnectAccount = async () => {
    await fetch(`/api/workspaces/${workspaceId}/referrals/stripe/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    mutate(`/api/workspaces/${workspaceId}`);
  };

  // Create link to use Hosted Onboarding from Stripe
  const createAccountLink = async () => {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/referrals/stripe/account-links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { url } = await response.json();

    console.log({ url });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
        <div className="flex flex-col space-y-3">
          <h2 className="text-xl font-medium">Stripe Treasury</h2>
          <p className="text-sm text-gray-500">
            Finish Stripe Treasury setup to start paying out your affiliates.
          </p>
        </div>
        {stripeConnectId && stripeFinancialId ? (
          <div className="flex w-full max-w-md items-center justify-between rounded-md border border-gray-300 bg-white p-2">
            <p className="text-sm text-gray-500"></p>
            {/* <CopyButton value={stripeConnectId} className="rounded-md" /> */}
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
          {(!stripeConnectId || !stripeFinancialId) && (
            <Button
              text="Enable Stripe Treasury"
              onClick={createConnectAccount}
            />
          )}

          {stripeConnectId && stripeFinancialId && (
            <Button text="Finish Treasury Setup" onClick={createAccountLink} />
          )}
        </div>
      </div>
    </div>
  );
}
