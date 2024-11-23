import { getDashboard } from "@/lib/fetchers/get-dashboard";
import { PlanProps } from "@/lib/types";
import Analytics from "@/ui/analytics";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: { dashboardId: string };
}) {
  const data = await getDashboard({ id: params.dashboardId });

  // if the dashboard or link doesn't exist
  if (!data?.link) {
    return;
  }

  return constructMetadata({
    title: `Analytics for ${data.link.domain}/${data.link.key} – ${process.env.NEXT_PUBLIC_APP_NAME}`,
    image: `${APP_DOMAIN}/api/og/analytics?domain=${data.link.domain}&key=${data.link.key}`,
    noIndex: true,
  });
}

export default async function dashboardPage({
  params,
}: {
  params: { dashboardId: string };
}) {
  const data = await getDashboard({ id: params.dashboardId });

  // if the dashboard or link doesn't exist
  if (!data?.link) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="h-screen w-full bg-gray-50" />}>
      <Analytics
        dashboardProps={{
          domain: data.link.domain,
          key: data.link.key,
          url: data.link.url,
          showConversions: data.showConversions,
          workspacePlan: data.project?.plan as PlanProps,
        }}
      />
    </Suspense>
  );
}
