import { getSession } from "@/lib/auth-app";
import { getLink } from "@/lib/fetchers";
import LinkNotFound from "@/ui/links/link-not-found";
import Stats from "@/ui/stats";

export default async function LinkAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  if (!searchParams?.key) {
    return <LinkNotFound />;
  }
  const [session, link] = await Promise.all([
    getSession(),
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
