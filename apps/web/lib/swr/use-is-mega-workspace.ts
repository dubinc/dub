import useWorkspace from "./use-workspace";

export function useIsMegaWorkspace() {
  const { totalLinks } = useWorkspace();

  return {
    isMegaWorkspace: totalLinks && totalLinks > 1_000_000,
  };
}
