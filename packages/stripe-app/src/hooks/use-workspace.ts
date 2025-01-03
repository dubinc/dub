import { useCallback, useEffect, useState } from "react";
import Stripe from "stripe";
import { fetchWorkspace } from "../utils/dub";
import { Workspace } from "../utils/types";

export const useWorkspace = (stripe: Stripe) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    const fetchedWorkspace = await fetchWorkspace({ stripe });
    setWorkspace(fetchedWorkspace);
    setIsLoading(false);
  }, [stripe]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return {
    workspace,
    isLoading,
    mutate: loadWorkspace,
  };
};
