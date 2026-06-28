import { fetcher } from "@dub/utils";
import Stripe from "stripe";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

type PaymentMethodsResponse = {
  paymentMethods: Stripe.PaymentMethod[];
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
