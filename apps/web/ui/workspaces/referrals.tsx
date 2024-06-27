"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui/src/button";
import { fetcher } from "@dub/utils";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { StripePaymentMethods } from "../referrals/stripe-payment-methods";

type FinancialAccount = {
  id: string;
  status: string;
  balance: {
    cash: { usd: number };
    inbound_pending: { usd: number };
    outbound_pending: { usd: number };
  };
};

// TODO:
// Display the FinancialAccount.financial_addresses[0] in the UI, Company can use this to send fund to their Financial Account

export default function Referrals() {
  const {
    id: workspaceId,
    stripeConnectId,
    stripeFinancialId,
    connectOnboardingFinished,
  } = useWorkspace();

  const { data: financialAccount, isLoading: isFinancialAccountLoading } =
    useSWR<FinancialAccount>(
      `/api/workspaces/${workspaceId}/referrals/stripe/accounts`,
      fetcher,
    );

  // Create Treasury Stripe Connect + Financial account
  const createConnectAccount = async () => {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/referrals/stripe/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      toast.success("Redirecting to finish onboarding process...");
      mutate(`/api/workspaces/${workspaceId}`);
      await createAccountLink();
    } else {
      toast.error("Error enabling Stripe Treasury. Please try again.");
    }
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

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    } else {
      toast.error("Error creating account link. Please try again.");
    }
  };

  const hasStripeAccount = stripeConnectId && stripeFinancialId;

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Stripe Treasury</h2>
            <p className="text-sm text-gray-500">
              Stripe Treasury allows you to manage your funds and payouts to
              your affiliates.
            </p>
          </div>
          {hasStripeAccount && !connectOnboardingFinished ? (
            <div className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2">
              <p className="text-sm text-gray-500">
                Let Stripe collect identity verification information for your
                connected accounts. This is required to enable payouts to your
                affiliates using Stripe Treasury. Clicking on{" "}
                <strong>Continue Onboarding</strong> will redirect you to Stripe
                to complete the onboarding process.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 p-8">
              <p className="text-sm text-gray-500">
                No Stripe account connected yet.
              </p>
            </div>
          )}

          {!isFinancialAccountLoading && financialAccount && (
            <>
              <h3 className="text-lg font-medium">Balance</h3>
              <pre className="text-sm">
                {JSON.stringify(financialAccount.balance, null, 2)}
              </pre>
            </>
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
            {!hasStripeAccount && (
              <Button
                text="Enable Stripe Treasury"
                onClick={createConnectAccount}
              />
            )}

            {hasStripeAccount && !connectOnboardingFinished && (
              <Button text="Continue Onboarding" onClick={createAccountLink} />
            )}
          </div>
        </div>
      </div>
      <StripePaymentMethods />
    </>
  );
}
