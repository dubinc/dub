import { fetcher } from "@dub/utils";
import useSWR, { SWRConfiguration } from "swr";
import { ExpandedLinkProps } from "../types";
import useWorkspace from "./use-workspace";

export default function useLink(
  linkIdOrLink: string | { domain: string; slug: string },
  swrOptions?: SWRConfiguration,
) {
  const { id: workspaceId } = useWorkspace();

  const { data: link, error } = useSWR<ExpandedLinkProps>(
    workspaceId &&
      linkIdOrLink &&
      (typeof linkIdOrLink === "string"
        ? `/api/links/${linkIdOrLink}?workspaceId=${workspaceId}`
        : `/api/links/info?domain=${linkIdOrLink.domain}&key=${linkIdOrLink.slug}&workspaceId=${workspaceId}`),
    fetcher,
    swrOptions,
  );

  return {
    link,
    loading: !link && !error,
  };
}
