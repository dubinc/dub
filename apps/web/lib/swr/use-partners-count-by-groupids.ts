import usePartnersCount from "./use-partners-count";

export function usePartnersCountByGroupIds({
  groupIds,
  partnerTagIds,
}: {
  groupIds?: string[] | null;
  partnerTagIds?: string[] | null;
}) {
  const { partnersCount, loading } = usePartnersCount<number | undefined>({
    ignoreParams: true,
    status: "approved",
    ...(groupIds?.length ? { groupId: groupIds } : {}),
    ...(partnerTagIds?.length ? { partnerTagId: partnerTagIds } : {}),
  });

  return {
    totalPartners: partnersCount ?? 0,
    loading,
  };
}
