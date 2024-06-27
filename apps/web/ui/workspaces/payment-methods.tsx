"use client";

import { getStripe } from "@/lib/stripe/client";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, LoadingSpinner } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Elements } from "@stripe/react-stripe-js";
import { Landmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useAddBankAccountModal } from "../modals/add-bank-account-modal";

interface PaymentMethod {
  id: string;
  type: string;
  us_bank_account: {
    bank_name: string;
    last4: string;
  };
  created: string;
}

export const PaymentMethods = () => {
  const {
    id: workspaceId,
    stripeConnectId,
    stripeFinancialId,
  } = useWorkspace();
  const { setShowAddBankAccountModal, AddBankAccountModal } =
    useAddBankAccountModal();

  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: paymentMethods, isLoading } = useSWR<any[]>(
    `/api/workspaces/${workspaceId}/referrals/stripe/payment-methods`,
    fetcher,
  );

  // Create a setup intent
  const createSetupIntent = async () => {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/referrals/stripe/setup-intent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error.message);
    } else {
      setClientSecret(data.client_secret);
      setShowAddBankAccountModal(true);
    }
  };

  if (!stripeConnectId || !stripeFinancialId) {
    return;
  }

  return (
    <>
      {clientSecret && (
        <Elements
          stripe={getStripe(stripeConnectId)}
          options={{
            clientSecret: clientSecret,
            appearance: {
              theme: "stripe",
              labels: "above",
              variables: {
                borderRadius: "0",
              },
            },
          }}
        >
          <AddBankAccountModal />
        </Elements>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Payment Methods</h2>
            <p className="text-sm text-gray-500">
              Add your payment methods to enable payouts to your affiliates. You
              can add your US bank account to pull funds.
            </p>
          </div>
        </div>

        {isLoading || !paymentMethods ? (
          <div className="flex flex-col items-center justify-center space-y-4 pb-20 pt-10">
            <LoadingSpinner className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">Fetching payment methods...</p>
          </div>
        ) : paymentMethods.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {(paymentMethods || []).map((paymentMethod) => (
              <PaymentMethodRow
                key={paymentMethod.id}
                paymentMethod={paymentMethod}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 pb-20 pt-10">
            <Landmark className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">
              No payment methods found. Add one to enable affiliate payouts.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-3 py-5 sm:px-10">
          <a
            href="https://dub.co/help/article/conversion-tracking"
            target="_blank"
            className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-700"
          >
            Learn more about Affiliate Payouts
          </a>
          <div>
            <Button text="Add Payment Method" onClick={createSetupIntent} />
          </div>
        </div>
      </div>
    </>
  );
};

const PaymentMethodRow = ({
  paymentMethod,
}: {
  paymentMethod: PaymentMethod;
}) => {
  return (
    <>
      <div className="relative grid grid-cols-5 items-center px-5 py-3 sm:px-10">
        <div className="col-span-3 flex items-center space-x-3">
          <Landmark className="h-6 w-6 text-gray-500" />
          <div className="flex flex-col space-y-px">
            <p className="font-semibold text-gray-700">
              {`${paymentMethod.us_bank_account.bank_name} ... ${paymentMethod.us_bank_account.last4}`}
            </p>
            <p className="text-sm text-gray-500" suppressHydrationWarning>
              Added {paymentMethod.created}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
