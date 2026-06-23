"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import type { PartnerContentSearchResponse } from "@/lib/swr/use-partner-content-search";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { useAction } from "next-safe-action/hooks";
import { useCallback } from "react";
import { toast } from "sonner";
import type { KeyedMutator } from "swr";

// Two near-identical optimistic star-toggle mutations live here. They share the
// same star-update action, toast-on-failure, optimisticData/populateCache/revalidate
// semantics, and rollback-on-error — they differ only in the SWR cache shape they
// mutate (the content-search response's nested `partner.starredAt` vs the ranked
// list's flat `starredAt`). Kept as two hooks rather than one parameterized hook so
// each cache transform stays verbatim and behavior is provably unchanged.

/**
 * Optimistic star toggle for content-search mode. Mutates the
 * `PartnerContentSearchResponse` cache, locating the partner by `partnerId` and
 * updating its nested `partner.starredAt`.
 */
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

/**
 * Optimistic star toggle for ranked-list mode. Mutates the
 * `NetworkPartnerProps[]` cache, locating the partner by `id` and updating its
 * flat `starredAt`. `partners` is used as the fallback when the cache is empty,
 * preserving the original closure's `data || partners` behavior.
 */
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
