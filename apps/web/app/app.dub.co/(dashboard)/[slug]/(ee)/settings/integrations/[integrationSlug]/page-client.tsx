"use client";

import { getIntegrationInstallUrl } from "@/lib/actions/get-integration-install-url";
import { clientAccessCheck } from "@/lib/client-access-check";
import { installAppsFlyerAction } from "@/lib/integrations/appsflyer/install";
import { AppsFlyerSettings } from "@/lib/integrations/appsflyer/ui/settings";
import { HubSpotSettings } from "@/lib/integrations/hubspot/ui/settings";
import { SegmentSettings } from "@/lib/integrations/segment/ui/settings";
import { SlackSettings } from "@/lib/integrations/slack/ui/settings";
import { stripeIntegrationSettingsSchema } from "@/lib/integrations/stripe/schema";
import { StripeIntegrationSettings } from "@/lib/integrations/stripe/ui/settings";
import { ZapierSettings } from "@/lib/integrations/zapier/ui/settings";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { IntegrationLogo } from "@/ui/integrations/integration-logo";
import { useUninstallIntegrationModal } from "@/ui/modals/uninstall-integration-modal";
import { BackLink } from "@/ui/shared/back-link";
import { CheckCircleFill, ThreeDots } from "@/ui/shared/icons";
import { Markdown } from "@/ui/shared/markdown";
import { UserAvatar } from "@/ui/users/user-avatar";
import {
  BlurImage,
  Button,
  buttonVariants,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
  CarouselThumbnail,
  CarouselThumbnails,
  Logo,
  MaxWidthWrapper,
  Popover,
  Tooltip,
  TooltipContent,
  useMediaQuery,
} from "@dub/ui";
import {
  CircleWarning,
  ConnectedDots,
  DubCraftedShield,
  Flask,
  Globe,
  OfficeBuilding,
  Trash,
} from "@dub/ui/icons";
import {
  APPSFLYER_INTEGRATION_ID,
  cn,
  DUB_WORKSPACE_ID,
  formatDate,
  getDomainWithoutWWW,
  SEGMENT_INTEGRATION_ID,
  SLACK_INTEGRATION_ID,
  STRIPE_INTEGRATION_ID,
  ZAPIER_INTEGRATION_ID,
} from "@dub/utils";
import { HUBSPOT_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const integrationSettings = {
  [ZAPIER_INTEGRATION_ID]: ZapierSettings,
  [SLACK_INTEGRATION_ID]: SlackSettings,
  [SEGMENT_INTEGRATION_ID]: SegmentSettings,
  [HUBSPOT_INTEGRATION_ID]: HubSpotSettings,
  [STRIPE_INTEGRATION_ID]: StripeIntegrationSettings,
  [APPSFLYER_INTEGRATION_ID]: AppsFlyerSettings,
};

export default function IntegrationPageClient({
  integration,
}: {
  integration: InstalledIntegrationInfoProps;
}) {
  const { id: workspaceId, slug, plan, role } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "integrations.write",
    role,
  }).error;
  const { isMobile } = useMediaQuery();

  const [openPopover, setOpenPopover] = useState(false);
  const { execute, isPending } = useAction(getIntegrationInstallUrl, {
    onSuccess: ({ data }) => {
      if (!data?.url) {
        throw new Error("Error getting installation URL");
      }

      window.location.href = data.url;
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const { execute: executeInstallAppsFlyer, isPending: isInstallingAppsFlyer } =
    useAction(installAppsFlyerAction, {
      onSuccess: () => {
        toast.success("AppsFlyer integration enabled successfully.");
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to enable AppsFlyer integration.",
        );
      },
    });

  const { UninstallIntegrationModal, setShowUninstallIntegrationModal } =
    useUninstallIntegrationModal({
      integration,
    });

  const SettingsComponent = integrationSettings[integration.id] || null;

  const stripeConnectionBannerConfig = useMemo(() => {
    if (integration.id !== STRIPE_INTEGRATION_ID || !integration.installed) {
      return null;
    }

    const parsed = stripeIntegrationSettingsSchema.safeParse(
      integration.settings ?? {},
    );
    const mode = parsed.success ? parsed.data.stripeMode : "live";

    const variants = {
      live: {
        bar: "bg-emerald-50",
        caption: "text-emerald-900",
        value: "font-semibold text-emerald-600",
        icon: <CheckCircleFill className="size-4 shrink-0 text-emerald-600" />,
        title: "Live Mode",
      },
      test: {
        bar: "bg-[#F0F7FF]",
        caption: "text-blue-900/80",
        value: "font-semibold text-blue-600",
        icon: <Flask className="size-4 shrink-0 text-blue-600" />,
        title: "Test Mode",
      },
      sandbox: {
        bar: "bg-orange-50",
        caption: "text-orange-900/80",
        value: "font-semibold text-orange-600",
        icon: <Flask className="size-4 shrink-0 text-orange-600" />,
        title: "Sandbox Mode",
      },
    } as const;

    return variants[mode];
  }, [integration.id, integration.installed, integration.settings]);

  const { canInstallAdvancedIntegrations } = getPlanCapabilities(plan);

  return (
    <MaxWidthWrapper className="grid max-w-screen-lg grid-cols-1 gap-6">
      {integration.installed && <UninstallIntegrationModal />}
      <BackLink href={`/${slug}/settings/integrations`}>Integrations</BackLink>
      <div className="flex justify-between gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <IntegrationLogo
            src={integration.logo ?? null}
            alt={`Logo for ${integration.name}`}
            className="size-10 sm:size-14 sm:rounded-lg"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-semibold leading-none text-neutral-800">
                {integration.name}
              </h1>
              {integration.projectId === DUB_WORKSPACE_ID ? (
                <Tooltip content="This is an official integration built and maintained by Dub">
                  <div>
                    <DubCraftedShield className="size-4 -translate-y-px" />
                  </div>
                </Tooltip>
              ) : !integration.verified ? (
                <Tooltip content="Dub hasn't verified this integration. Install it at your own risk.">
                  <div>
                    <CircleWarning className="size-5 text-neutral-500" invert />
                  </div>
                </Tooltip>
              ) : null}
            </div>
            <p className="mt-1 text-[0.8125rem] leading-snug text-neutral-600">
              {integration.description}
            </p>
          </div>
        </div>

        {integration.installed && (
          <Popover
            align="end"
            content={
              <div className="grid w-screen gap-px p-2 sm:w-48">
                <Button
                  text="Remove Integration"
                  variant="danger-outline"
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setShowUninstallIntegrationModal(true);
                  }}
                  disabledTooltip={
                    integration.slug === "stripe" ? (
                      <TooltipContent
                        title="You cannot uninstall the Stripe integration from here. Please visit the Stripe dashboard to uninstall the app."
                        cta="Go to Stripe"
                        href="https://dashboard.stripe.com/settings/apps/dub.co"
                        target="_blank"
                      />
                    ) : (
                      permissionsError || undefined
                    )
                  }
                />
              </div>
            }
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <button
              onClick={() => setOpenPopover(!openPopover)}
              className={cn(
                "flex h-10 items-center rounded-md border px-1.5 outline-none transition-all",
                "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400",
                "focus-visible:border-neutral-500 data-[state=open]:border-neutral-500 data-[state=open]:ring-4 data-[state=open]:ring-neutral-200",
              )}
            >
              <ThreeDots className="h-5 w-5 text-neutral-500" />
            </button>
          </Popover>
        )}
      </div>

      <div
        className={cn(
          stripeConnectionBannerConfig && "flex flex-col items-stretch",
        )}
      >
        <div className="z-10 flex flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:gap-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            {[
              ...(integration.installed
                ? [
                    {
                      label: "Enabled by",
                      content: (
                        <span className="text-neutral-700">
                          <UserAvatar
                            user={integration.installed.by}
                            className="inline-block size-3 -translate-y-0.5 border-0"
                          />{" "}
                          {integration.installed.by.name}
                          <span className="ml-1 font-normal text-neutral-600">
                            {formatDate(integration.installed.createdAt, {
                              month: "short",
                              year:
                                integration.installed.createdAt.getFullYear() ===
                                new Date().getFullYear()
                                  ? undefined
                                  : "numeric",
                            })}
                          </span>
                        </span>
                      ),
                    },
                  ]
                : []),
              {
                label: "Built by",
                content: (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
                    {integration.projectId === DUB_WORKSPACE_ID ? (
                      <Logo className="size-3.5" />
                    ) : (
                      <OfficeBuilding className="size-3.5" />
                    )}
                    {integration.developer}
                  </div>
                ),
              },
              {
                label: "Website",
                content: (
                  <a
                    href={integration.website}
                    className="flex items-center gap-1.5 text-sm text-neutral-700 transition-colors duration-100 hover:text-neutral-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="size-3.5" />
                    {getDomainWithoutWWW(integration.website)}
                  </a>
                ),
              },
            ].map(({ label, content }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-xs uppercase text-neutral-500">
                  {label}
                </span>
                <div className="text-[0.8125rem] font-medium text-neutral-600">
                  {content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-x-2">
            {slug === "dub" && (
              <Link
                href={`/${slug}/settings/integrations/${integration.slug}/manage`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-9 items-center rounded-md border px-4 text-sm",
                )}
              >
                Manage
              </Link>
            )}
            {!integration.installed &&
              integration.id !== SEGMENT_INTEGRATION_ID && (
                <Button
                  onClick={() => {
                    if (integration.id === APPSFLYER_INTEGRATION_ID) {
                      executeInstallAppsFlyer({
                        workspaceId: workspaceId!,
                      });
                      return;
                    }

                    const { installUrl } = integration;

                    if (installUrl) {
                      // open in a new tab
                      window.open(installUrl, "_blank");
                      return;
                    }

                    execute({
                      workspaceId: workspaceId!,
                      integrationSlug: integration.slug,
                    });
                  }}
                  loading={isPending || isInstallingAppsFlyer}
                  text="Enable"
                  variant="primary"
                  className="h-9 px-3"
                  icon={<ConnectedDots className="size-4" />}
                  disabledTooltip={
                    [HUBSPOT_INTEGRATION_ID, APPSFLYER_INTEGRATION_ID].includes(
                      integration.id,
                    ) && !canInstallAdvancedIntegrations ? (
                      <TooltipContent
                        title="This integration is only available on Advanced and Enterprise plans."
                        cta="Upgrade to Advanced"
                        href={`/${slug}/settings/billing/upgrade?plan=advanced`}
                      />
                    ) : undefined
                  }
                />
              )}
          </div>
        </div>
        {stripeConnectionBannerConfig && (
          <div
            className={cn(
              "relative -mt-1.5 flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-b-lg px-4 pb-2 pt-3.5",
              stripeConnectionBannerConfig.bar,
            )}
          >
            <span
              className={cn("text-sm", stripeConnectionBannerConfig.caption)}
            >
              Connection type
            </span>
            <div className="flex items-center gap-1.5">
              {stripeConnectionBannerConfig.icon}
              <span
                className={cn("text-sm", stripeConnectionBannerConfig.value)}
              >
                {stripeConnectionBannerConfig.title}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full rounded-lg border border-neutral-200 bg-white">
        {integration.screenshots && integration.screenshots.length > 0 ? (
          <Carousel autoplay={{ delay: 5000 }}>
            <div className="relative rounded-t-lg bg-white p-4">
              <CarouselContent>
                {integration.screenshots.map((src, idx) => (
                  <CarouselItem key={idx}>
                    <BlurImage
                      src={src}
                      alt={`Screenshot ${idx + 1} of ${integration.name}`}
                      width={900}
                      height={580}
                      className="aspect-[900/580] w-[5/6] overflow-hidden rounded-md border border-neutral-200 object-cover object-top"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselNavBar
                variant="simple"
                className="absolute bottom-6 left-1/2 -translate-x-1/2"
              />
            </div>
            {!isMobile && (
              <div className="relative">
                <CarouselThumbnails className="py-0.5">
                  {integration.screenshots.map((src, idx) => (
                    <CarouselThumbnail
                      key={idx}
                      index={idx}
                      className={({ active }) =>
                        cn(
                          "aspect-[900/580] h-[100px] shrink-0 select-none overflow-hidden rounded-[6px] border",
                          "border-neutral-200 ring-2 ring-transparent transition-all duration-100",
                          active
                            ? "border-neutral-300 ring-black/10"
                            : "hover:ring-black/5",
                        )
                      }
                    >
                      <BlurImage
                        src={src}
                        alt={`Screenshot ${idx + 1} thumbnail`}
                        width={900}
                        height={580}
                        className="overflow-hidden rounded-[5px] object-cover object-top"
                      />
                    </CarouselThumbnail>
                  ))}
                </CarouselThumbnails>

                <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white" />
                <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white" />
              </div>
            )}
          </Carousel>
        ) : null}

        {integration.readme && (
          <Markdown className="p-6">{integration.readme}</Markdown>
        )}
      </div>

      {SettingsComponent && <SettingsComponent {...integration} />}
    </MaxWidthWrapper>
  );
}
