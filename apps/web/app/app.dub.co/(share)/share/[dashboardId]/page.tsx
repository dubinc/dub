import { getDashboard } from "@/lib/fetchers/get-dashboard";
import { PlanProps } from "@/lib/types";
import Analytics from "@/ui/analytics";
import { AuroraGradient } from "@/ui/shared/aurora-gradient";
import { Footer, Grid, Nav, NavMobile, ShieldKeyhole, Wordmark } from "@dub/ui";
import { APP_DOMAIN, cn, constructMetadata } from "@dub/utils";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import DashboardPasswordForm from "./form";

export async function generateMetadata(props: {
  params: Promise<{ dashboardId: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const data = await getDashboard({ id: params.dashboardId });

  // if the dashboard, link, or folder doesn't exist
  if (!data?.link && !data?.folder) {
    return {};
  }

  return constructMetadata({
    title: `Analytics for ${data.link ? `${data.link.domain}/${data.link.key}` : data.folder!.name}`,
    image: `${APP_DOMAIN}/api/og/analytics?${data.link ? `linkId=${data.link.id}` : `folderId=${data.folder!.id}`}`,
    noIndex: !data.doIndex,
  });
}

export default async function DashboardPage(props: {
  params: Promise<{ dashboardId: string }>;
}) {
  const params = await props.params;
  const data = await getDashboard({ id: params.dashboardId });

  // if the dashboard, link, or folder doesn't exist
  if (!data?.link && !data?.folder) {
    notFound();
  }

  if (
    data.password &&
    (await cookies()).get(`dub_password_${params.dashboardId}`)?.value !==
      data.password
  ) {
    return (
      <main className="relative min-h-[100dvh]">
        <div className="absolute inset-0 isolate overflow-hidden bg-neutral-50">
          {/* Grid */}
          <div
            className={cn(
              "absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2",
              "[mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
            )}
          >
            <Grid
              cellSize={60}
              patternOffset={[0.75, 0]}
              className="text-neutral-200"
            />
          </div>

          <AuroraGradient />
        </div>

        <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 pb-12 pt-20">
          <a
            href="https://dub.co"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-1/2 top-4 -translate-x-1/2"
          >
            <Wordmark className="h-8" />
          </a>

          <div className="animate-slide-up-fade flex w-full max-w-[320px] flex-col items-center [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]">
            <div className="flex size-8 items-center justify-center rounded-md bg-neutral-200/60">
              <ShieldKeyhole className="size-[18px] text-neutral-800" />
            </div>
            <h1 className="mt-4 text-center text-xl font-semibold text-neutral-900">
              Enter Password
            </h1>
            <p className="mt-1 text-center text-base font-medium text-neutral-500">
              This dashboard is password protected.
            </p>
            <div className="mt-10 w-full">
              <DashboardPasswordForm />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const domain = data.link?.domain || "app.dub.co";

  return (
    <div className="flex min-h-screen flex-col justify-between bg-neutral-50/80">
      <NavMobile staticDomain={domain} />
      <Nav staticDomain={domain} />
      <Suspense fallback={<div className="h-screen w-full bg-neutral-50" />}>
        <Analytics
          dashboardProps={{
            ...(data.link
              ? {
                  domain: data.link.domain,
                  key: data.link.key,
                  url: data.link.url,
                }
              : {
                  folderId: data.folder!.id,
                  folderName: data.folder!.name,
                }),
            showConversions: data.showConversions,
            workspacePlan: data.project?.plan as PlanProps,
          }}
        />
      </Suspense>
      <Footer staticDomain={domain} />
    </div>
  );
}
