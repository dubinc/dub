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
        : `/api/links/info?${new URLSearchParams({
            workspaceId,
            domain: linkIdOrLink.domain,
            key: linkIdOrLink.slug,
            includeUser: "true",
            includeWebhooks: "true",
          })}`),
    fetcher,
    swrOptions,
  );

  return {
    link,
    loading: !link && !error,
  };
}
