import useWorkspace from "@/lib/swr/use-workspace";
import { Hyperlink, LinkLogo } from "@dub/ui";
import { fetcher, getApexDomain } from "@dub/utils";
import useSWR from "swr";

export function LinkIcon({
  url: urlProp,
  domain,
  linkKey,
}: {
  url?: string;
  domain?: string;
  linkKey?: string;
}) {
  const { id: workspaceId } = useWorkspace();
  const { data } = useSWR<{ url: string }>(
    !urlProp && workspaceId && domain && linkKey
      ? `/api/links/info?${new URLSearchParams({ workspaceId, domain, key: linkKey }).toString()}`
      : null,
    fetcher,
  );

  const url = urlProp || data?.url;
  return url ? (
    <LinkLogo
      apexDomain={getApexDomain(url)}
      className="h-4 w-4 sm:h-4 sm:w-4"
    />
  ) : (
    <Hyperlink className="h-4 w-4" />
  );
}
