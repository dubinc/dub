"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { updateWorkspaceStore } from "../actions/update-workspace-store";
import useWorkspace from "./use-workspace";

export const STORE_KEYS = {
  conversionsOnboarding: "conversionsOnboarding",
  dotLinkOfferDismissed: "dotLinkOfferDismissed",
};

export function useWorkspaceStore<T>(
  key: string,
): [
  T | undefined,
  (value: T) => Promise<void>,
  { loading: boolean; mutateWorkspace: () => void },
] {
  const {
    id: workspaceId,
    slug,
    store,
    loading: loadingWorkspace,
  } = useWorkspace();
  const [loading, setLoading] = useState(loadingWorkspace);

  const { executeAsync } = useAction(updateWorkspaceStore);
  const [item, setItemState] = useState<T | undefined>(store?.[key]);

  useEffect(() => {
    if (!loadingWorkspace) {
      setItemState(store?.[key]);
      setLoading(false);
    }
  }, [store, loadingWorkspace]);

  const setItem = async (value: T) => {
    setItemState(value);
    await executeAsync({ key, value, workspaceId: workspaceId! });
  };

  const mutateWorkspace = () => {
    mutate(`/api/workspaces/${slug}`);
  };

  return [item, setItem, { loading, mutateWorkspace }];
}
