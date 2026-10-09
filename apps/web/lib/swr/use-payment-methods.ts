import type { WorkspacePaymentMethod } from "@/lib/stripe/microdeposit-types";
import { fetcher } from "@dub/utils";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

export type { WorkspacePaymentMethod };

type PaymentMethodsResponse = {
  paymentMethods: WorkspacePaymentMethod[];
  defaultPaymentMethodId: string | null;
};

// Returns the Stripe payment methods for the business
export default function usePaymentMethods({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { slug } = useWorkspace();

  const { data, isLoading, error } = useSWR<PaymentMethodsResponse>(
    enabled && slug && `/api/workspaces/${slug}/billing/payment-methods`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  return {
    paymentMethods: data?.paymentMethods,
    defaultPaymentMethodId: data?.defaultPaymentMethodId ?? null,
    error,
    loading: isLoading,
  };
}
