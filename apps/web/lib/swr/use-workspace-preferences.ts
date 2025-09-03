"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { updateWorkspacePreferences } from "../actions/update-workspace-preferences";
import {
  WorkspacePreferencesKey,
  WorkspacePreferencesValue,
} from "../zod/schemas/workspace-preferences";
import useWorkspace from "./use-workspace";

export const WORKSPACE_PREFERENCES_KEYS = {
  linksDisplay: "linksDisplay",
};

export function useWorkspacePreferences<
  K extends WorkspacePreferencesKey,
  D extends WorkspacePreferencesValue<K> | undefined,
>(
  key: K,
  defaultValue?: D,
): [
  D extends undefined
    ? WorkspacePreferencesValue<K> | undefined
    : WorkspacePreferencesValue<K>,
  (value: WorkspacePreferencesValue<K>) => Promise<void>,
  { loading: boolean; mutateWorkspace: () => void },
] {
  const { id: workspaceId, slug, users, loading } = useWorkspace();
  const workspacePreferences = users?.[0]?.workspacePreferences;

  const { executeAsync } = useAction(updateWorkspacePreferences);
  const [item, setItemState] = useState<
    WorkspacePreferencesValue<K> | undefined
  >(workspacePreferences?.[key]);

  useEffect(() => {
    setItemState(workspacePreferences?.[key]);
  }, [workspacePreferences]);

  const setItem = async (value: WorkspacePreferencesValue<K>) => {
    setItemState(value);
    await executeAsync({ key, value, workspaceId: workspaceId! });
  };

  const mutateWorkspace = () => {
    mutate(`/api/workspaces/${slug}`);
  };

  return [item ?? defaultValue, setItem, { loading, mutateWorkspace }];
}
