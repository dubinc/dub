import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerProfileCustomerProps } from "../types";

export default function usePartnerCustomer({
  customerId,
}: {
  customerId: string;
}) {
  const { programSlug } = useParams<{ programSlug: string }>();

  const { data, isLoading } = useSWR<PartnerProfileCustomerProps>(
    programSlug &&
      customerId &&
      `/api/partner-profile/programs/${programSlug}/customers/${customerId}`,
    fetcher,
  );

  return {
    data,
    isLoading,
  };
}
