import { useEffect, useState } from "react";
import { WorkspaceProps } from "../src/types";

export default function useWorkspaces() {

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error("Failed to fetch workspaces");
    }
  };

  const [workspaces, setWorkspaces] = useState<WorkspaceProps[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchWorkspaces()
      .then((data) => {
        setWorkspaces(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const freeWorkspaces = workspaces?.filter(
    (workspace) =>
      workspace.plan === "free" &&
      workspace?.users &&
      workspace.users[0].role === "owner"
  );

  const exceedingFreeWorkspaces = freeWorkspaces && freeWorkspaces.length >= 2;

  return {
    workspaces,
    freeWorkspaces,
    exceedingFreeWorkspaces,
    error,
    loading,
  };
}
