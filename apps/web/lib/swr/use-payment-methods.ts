import { fetcher } from "@dub/utils";
import Stripe from "stripe";
import useSWR from "swr";
import useWorkspace from "./use-workspace";

// Returns the Stripe payment methods for the business
export default function usePaymentMethods() {
  const { slug } = useWorkspace();

  const {
    data: paymentMethods,
    isLoading,
    error,
  } = useSWR<Stripe.PaymentMethod[]>(
    slug && `/api/workspaces/${slug}/billing/payment-methods`,
    fetcher,
  );

  return {
    paymentMethods,
    error,
    loading: isLoading,
  };
}
