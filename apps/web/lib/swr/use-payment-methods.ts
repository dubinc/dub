import { fetcher } from "@dub/utils";
import Stripe from "stripe";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

// Returns the Stripe payment methods for the business
export default function usePaymentMethods({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { slug } = useWorkspace();

  const {
    data: paymentMethods,
    isLoading,
    error,
  } = useSWR<Stripe.PaymentMethod[]>(
    enabled && slug && `/api/workspaces/${slug}/billing/payment-methods`,
    fetcher,
  );

  return {
    paymentMethods,
    error,
    loading: isLoading,
  };
}
