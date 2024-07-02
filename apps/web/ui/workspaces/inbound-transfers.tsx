"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LoadingSpinner } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Landmark } from "lucide-react";
import useSWR from "swr";

interface InboundTransfer {
  id: string;
  created: string;
  currency: string;
  amount: number;
  description: string;
  hosted_regulatory_receipt_url: string;
  status: string;
  returned: boolean;
}

export const InboundTransfers = () => {
  const { id: workspaceId } = useWorkspace();

  const { data: inboundTransfers, isLoading } = useSWR<any[]>(
    `/api/workspaces/${workspaceId}/referrals/stripe/inbound-transfers`,
    fetcher,
  );

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Recent Transactions</h2>
            <p className="text-sm text-gray-500">
              Transactions sent to your Financial Account.
            </p>
          </div>
        </div>

        {isLoading || !inboundTransfers ? (
          <div className="flex flex-col items-center justify-center space-y-4 pb-20 pt-10">
            <LoadingSpinner className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">Fetching payment methods...</p>
          </div>
        ) : inboundTransfers.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {(inboundTransfers || []).map((inboundTransfer) => (
              <InboundTransferRow
                key={inboundTransfer.id}
                inboundTransfer={inboundTransfer}
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
      </div>
    </>
  );
};

const InboundTransferRow = ({
  inboundTransfer,
}: {
  inboundTransfer: InboundTransfer;
}) => {
  return (
    <>
      <div className="relative grid grid-cols-5 items-center px-5 py-3 sm:px-10">
        <div className="col-span-3 flex items-center space-x-3">
          <Landmark className="h-6 w-6 text-gray-500" />
          <div className="flex flex-col space-y-px">
            {inboundTransfer.returned ? (
              <p className="font-semibold text-gray-500">
                - ${inboundTransfer.amount / 100} USD
              </p>
            ) : (
              <p className="font-semibold text-green-500">
                + ${inboundTransfer.amount / 100} USD
              </p>
            )}
            <p className="text-sm text-gray-500" suppressHydrationWarning>
              Added {inboundTransfer.created}
            </p>
            <p className="text-sm text-gray-500">
              {inboundTransfer.description}
            </p>
            <a
              className="text-sm text-blue-500 underline"
              target="_blank"
              rel="noreferrer"
              href={inboundTransfer.hosted_regulatory_receipt_url}
            >
              Receipt
            </a>
            <p className="text-sm text-gray-500">{inboundTransfer.status}</p>
          </div>
        </div>
      </div>
    </>
  );
};
