"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import type { PartnerContentSearchResponse } from "@/lib/swr/use-partner-content-search";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { useAction } from "next-safe-action/hooks";
import { useCallback } from "react";
import { toast } from "sonner";
import type { KeyedMutator } from "swr";

// Two optimistic star-toggle hooks for the two cache shapes (content-search's nested
// `partner.starredAt` vs the ranked list's flat `starredAt`). Left unparameterized so
// each cache transform stays verbatim.

// Content-search cache: find the partner by `partnerId`, update nested `partner.starredAt`.
export function useToggleStarredContentSearch(
  mutateContentSearch: KeyedMutator<PartnerContentSearchResponse>,
) {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

  return useCallback(
    (partnerId: string, starred: boolean) => {
      mutateContentSearch(
        // @ts-ignore SWR doesn't seem to have proper typing for partial data results w/ `populateCache`
        async () => {
          const result = await updateDiscoveredPartner({
            workspaceId: workspaceId!,
            partnerId,
            starred,
          });
          if (!result?.data) {
            toast.error("Failed to star partner");
            throw new Error("Failed to star partner");
          }

          return result.data;
        },
        {
          optimisticData: (data) =>
            data && {
              ...data,
              partners: data.partners.map((p) =>
                p.partnerId === partnerId
                  ? {
                      ...p,
                      partner: {
                        ...p.partner,
                        starredAt: starred ? new Date() : null,
                      },
                    }
                  : p,
              ),
            },
          populateCache: (result: { starredAt: Date | null }, data) =>
            data && {
              ...data,
              partners: data.partners.map((p) =>
                p.partnerId === partnerId
                  ? {
                      ...p,
                      partner: {
                        ...p.partner,
                        starredAt: result.starredAt,
                      },
                    }
                  : p,
              ),
            },
          revalidate: false,
        },
      );
    },
    [mutateContentSearch, updateDiscoveredPartner, workspaceId],
  );
}

// Ranked-list cache: find the partner by `id`, update flat `starredAt`. `partners`
// is the fallback when the cache is empty (`data || partners`).
export function useToggleStarredRankedList(
  mutatePartners: KeyedMutator<NetworkPartnerProps[]>,
  partners: NetworkPartnerProps[] | undefined,
) {
  const { id: workspaceId } = useWorkspace();
  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

  return useCallback(
    (partnerId: string, starred: boolean) => {
      mutatePartners(
        // @ts-ignore SWR doesn't seem to have proper typing for partial data results w/ `populateCache`
        async () => {
          const result = await updateDiscoveredPartner({
            workspaceId: workspaceId!,
            partnerId,
            starred,
          });
          if (!result?.data) {
            toast.error("Failed to star partner");
            throw new Error("Failed to star partner");
          }

          return result.data;
        },
        {
          optimisticData: (data) =>
            (data || partners)!.map((p) =>
              p.id === partnerId
                ? {
                    ...p,
                    starredAt: starred ? new Date() : null,
                  }
                : p,
            ),
          populateCache: (result: { starredAt: Date | null }, data) =>
            (data || partners)!.map((p) =>
              p.id === partnerId ? { ...p, starredAt: result.starredAt } : p,
            ),
          revalidate: false,
        },
      );
    },
    [mutatePartners, partners, updateDiscoveredPartner, workspaceId],
  );
}
