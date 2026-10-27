import { fetcher } from "@dub/utils";
import useSWR from "swr";
import { CustomerActivityResponse } from "../types";
import useWorkspace from "./use-workspace";

export default function useCustomerActivity({
  customerId,
}: {
  customerId: string;
}) {
  const { id: workspaceId } = useWorkspace();
  const { data: customerActivity, isLoading: isCustomerActivityLoading } =
    useSWR<CustomerActivityResponse>(
      customerId &&
        workspaceId &&
        `/api/customers/${customerId}/activity?workspaceId=${workspaceId}`,
      fetcher,
    );

  return {
    customerActivity,
    isCustomerActivityLoading,
  };
}
