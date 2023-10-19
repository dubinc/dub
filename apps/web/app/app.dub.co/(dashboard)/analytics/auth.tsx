import { getSession } from "@/lib/auth-app";
import { getLink } from "@/lib/fetchers";
import LinkNotFound from "@/ui/links/link-not-found";

export default async function AnalyticsAuth({
  searchParams,
  children,
}: {
  searchParams: { [key: string]: string | undefined };
  children: React.ReactNode;
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

  return children as JSX.Element;
}
