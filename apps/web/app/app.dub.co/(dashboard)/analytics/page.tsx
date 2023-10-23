import { getSession } from "@/lib/auth";
import { getLink } from "@/lib/fetchers";
import LinkNotFound from "@/ui/links/link-not-found";
import Stats from "@/ui/stats";
import { cache } from "react";

const cachedGetSession = cache(getSession);

export default async function LinkAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  if (searchParams.domain !== "dub.sh" || !searchParams?.key) {
    return <LinkNotFound />;
  }
  const [session, link] = await Promise.all([
    cachedGetSession(),
    getLink({
      domain: searchParams.domain || "dub.sh",
      key: searchParams.key || "github",
    }),
  ]);

  if (session?.user?.id !== link?.userId) {
    return <LinkNotFound />;
  }
  return <Stats />;
}
