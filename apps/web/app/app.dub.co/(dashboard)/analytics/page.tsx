import { getSession } from "@/lib/auth-app";
import { getLink } from "@/lib/fetchers";
import LayoutLoader from "@/ui/layout/layout-loader";
import LinkNotFound from "@/ui/links/link-not-found";
import Stats from "@/ui/stats";
import { Suspense } from "react";

export default function LinkAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  console.log({ searchParams });
  return (
    <Suspense fallback={<LayoutLoader />}>
      <AnalyticsAuth searchParams={searchParams}>
        <Stats />
      </AnalyticsAuth>
    </Suspense>
  );
}

async function AnalyticsAuth({
  searchParams,
  children,
}: {
  searchParams: { [key: string]: string | undefined };
  children: React.ReactNode;
}) {
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
