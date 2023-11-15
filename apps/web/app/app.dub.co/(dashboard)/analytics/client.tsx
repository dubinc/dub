"use client";

import LayoutLoader from "@/ui/layout/layout-loader";
import LinkNotFound from "@/ui/links/link-not-found";
import { fetcher, isDubDomain } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import useSWR from "swr";

export default function AnalyticsClient({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const domain = searchParams?.get("domain");
  const key = searchParams?.get("key");

  const { slug } = useParams() as { slug?: string };
  const { data: session, status } = useSession();
  const { data: link, isLoading } = useSWR(
    domain &&
      key &&
      `/api/links/info?domain=${domain}&key=${key}${
        slug ? `&projectSlug=${slug}` : ""
      }`,
    fetcher,
    { dedupingInterval: 30000 },
  );

  if (status === "loading" || isLoading) {
    return <LayoutLoader />;
  }

  if (!domain || !key || !isDubDomain(domain)) {
    return <LinkNotFound />;
  }

  // @ts-expect-error
  if (session?.user?.id !== link?.userId) {
    return <LinkNotFound />;
  }

  return children;
}
