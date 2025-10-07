import useProgram from "@/lib/swr/use-program";
import { fetcher } from "@dub/utils";
import useSWR from "swr";

type RewardsAndDiscounts = {
  rewards: Array<{
    type: "click" | "lead" | "sale";
    iconType: "CursorRays" | "UserPlus" | "InvoiceDollar";
    text: string;
    reward: any;
  }>;
  discount: {
    text: string;
    discount: any;
  } | null;
} | null;

export function usePartnerRewardsAndDiscounts(partnerId: string) {
  const { program } = useProgram();

  const { data, error, isLoading } = useSWR<RewardsAndDiscounts>(
    program?.id && partnerId
      ? `/(ee)/api/partners/${partnerId}/rewards-and-discounts?programId=${program.id}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    rewardsAndDiscounts: data,
    isLoading,
    error,
  };
}
