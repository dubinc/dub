import { fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { PartnerProfileCustomerProps } from "../types";

export default function usePartnerCustomers() {
  const { programSlug } = useParams<{ programSlug: string }>();

  const { data, isLoading } = useSWR<
    (PartnerProfileCustomerProps & { name?: string | null })[]
  >(
    programSlug && `/api/partner-profile/programs/${programSlug}/customers`,
    fetcher,
  );

  return {
    data,
    isLoading,
  };
}
