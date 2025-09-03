import { deepViewDataSchema } from "@/lib/zod/schemas/deep-links";
import { prisma } from "@dub/prisma";
import { Grid, Wordmark } from "@dub/ui";
import { ArrowRight, Copy, IOSAppStore, MobilePhone } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeepLinkActionButtons } from "./action-buttons";
import { BrandLogoBadge } from "./brand-logo-badge";

export default async function DeepLinkPreviewPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
      },
    },
    select: {
      shortLink: true,
      url: true,
      ios: true,
      shortDomain: {
        select: {
          appleAppSiteAssociation: true,
          deepviewData: true,
        },
      },
    },
  });

  // if the link doesn't exist, we redirect to the root domain link
  if (!link) {
    redirect(`https://${domain}`);
  }

  const deepViewData = deepViewDataSchema.parse(link.shortDomain.deepviewData);

  // if the link domain doesn't have an AASA file configured (or deepviewData is null)
  // we skip the deep link preview and redirect to the link's URL
  if (!link.shortDomain.appleAppSiteAssociation || !deepViewData) {
    redirect(link.ios ?? link.url);
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col bg-white">
      <div className="absolute inset-0 isolate overflow-hidden bg-white">
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

        {[...Array(2)].map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6]",
              idx === 0 ? "mix-blend-overlay" : "opacity-10",
            )}
          >
            {[...Array(idx === 0 ? 2 : 1)].map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                  "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-8 py-8">
        <div className="flex justify-center">
          <Link
            href="https://dub.co/docs/concepts/deep-links/quickstart"
            target="_blank"
            className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-neutral-900"
          >
            Powered by <Wordmark className="text-content-emphasis h-3.5" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-12">
          <div className="flex flex-col items-center gap-y-6">
            <BrandLogoBadge link={link} />

            <div className="flex h-40 w-full max-w-xs flex-col gap-6 rounded-xl border border-neutral-300 px-10 py-8">
              <p className="text-center text-sm font-normal leading-5 text-neutral-700">
                Clicking below will copy this page and open it in the app.
              </p>

              <div className="flex items-center justify-center gap-3">
                <Copy className="text-content-default size-6" />
                <ArrowRight className="text-content-subtle size-3" />
                <IOSAppStore className="text-content-default size-6" />
                <ArrowRight className="text-content-subtle size-3" />
                <MobilePhone className="text-content-default size-6" />
              </div>
            </div>
          </div>

          <DeepLinkActionButtons link={link} />
        </div>
      </div>
    </main>
  );
}
