"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { updateWorkspacePreferences } from "../actions/update-workspace-preferences";
import useWorkspace from "./use-workspace";

export const WORKSPACE_PREFERENCES_KEYS = {
  linksDisplay: "linksDisplay",
};

export function useWorkspacePreferences<T>(
  key: string,
): [
  T | undefined,
  (value: T) => Promise<void>,
  { loading: boolean; mutateWorkspace: () => void },
] {
  const { id: workspaceId, slug, users, loading } = useWorkspace();
  const workspacePreferences = users?.[0]?.workspacePreferences;

  const { executeAsync } = useAction(updateWorkspacePreferences);
  const [item, setItemState] = useState<T | undefined>(
    workspacePreferences?.[key],
  );

  useEffect(() => {
    setItemState(workspacePreferences?.[key]);
  }, [workspacePreferences]);

  const setItem = async (value: T) => {
    setItemState(value);
    await executeAsync({ key, value, workspaceId: workspaceId! });
  };

  const mutateWorkspace = () => {
    mutate(`/api/workspaces/${slug}`);
  };

  return [item, setItem, { loading, mutateWorkspace }];
}
