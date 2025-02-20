import { useCallback, useEffect, useState } from "react";
import Stripe from "stripe";
import { getSecret } from "../utils/secrets";
import { Workspace } from "../utils/types";

// Retrieve the workspace from the secrets
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

async function fetchWorkspace({ stripe }: { stripe: Stripe }) {
  const workspace = await getSecret<Workspace>({
    stripe,
    name: "dub_workspace",
  });

  return workspace;
}
