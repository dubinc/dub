"use client";

import { getIntegrationInstallUrl } from "@/lib/actions/get-integration-install-url";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { useUninstallIntegrationModal } from "@/ui/modals/uninstall-integration-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Avatar,
  BlurImage,
  Button,
  buttonVariants,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavBar,
  MaxWidthWrapper,
  Popover,
  TokenAvatar,
} from "@dub/ui";
import {
  CircleWarning,
  ConnectedDots,
  Globe,
  OfficeBuilding,
  ShieldCheck,
} from "@dub/ui/src/icons";
import { Tooltip, TooltipContent } from "@dub/ui/src/tooltip";
import {
  cn,
  formatDate,
  getPrettyUrl,
  STRIPE_INTEGRATION_ID,
} from "@dub/utils";
import { BookOpenText, ChevronLeft, Trash } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

export default function IntegrationPageClient({
  integration,
}: {
  integration: InstalledIntegrationInfoProps;
}) {
  const { slug, id: workspaceId, conversionEnabled } = useWorkspace();

  const [openPopover, setOpenPopover] = useState(false);
  const getInstallationUrl = useAction(getIntegrationInstallUrl, {
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

  const { UninstallIntegrationModal, setShowUninstallIntegrationModal } =
    useUninstallIntegrationModal({
      integration: integration,
    });

  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
      {integration.installed && <UninstallIntegrationModal />}
      <Link
        href={`/${slug}/settings/integrations`}
        className="flex items-center gap-x-1"
      >
        <ChevronLeft className="size-4" />
        <p className="text-sm font-medium text-gray-500">Integrations</p>
      </Link>
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-x-3">
          <div className="flex-none rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
            {integration.logo ? (
              <BlurImage
                src={integration.logo}
                alt={`Logo for ${integration.name}`}
                className="size-8 rounded-full border border-gray-200"
                width={20}
                height={20}
              />
            ) : (
              <TokenAvatar id={integration.id} className="size-8" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="font-semibold text-gray-700">{integration.name}</p>
              <Tooltip
                content={
                  integration.verified
                    ? "This is a verified integration."
                    : "Dub hasn't verified this integration. Install it at your own risk."
                }
              >
                <div>
                  {integration.verified ? (
                    <ShieldCheck className="size-5 text-[#E2B719]" invert />
                  ) : (
                    <CircleWarning className="size-5 text-gray-500" invert />
                  )}
                </div>
              </Tooltip>
            </div>
            <p className="text-sm text-gray-500">{integration.description}</p>
          </div>
        </div>

        {integration.installed && (
          <Popover
            align="end"
            content={
              <div className="grid w-screen gap-px p-2 sm:w-48">
                <Button
                  text="Uninstall Integration"
                  variant="danger-outline"
                  icon={<Trash className="size-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setShowUninstallIntegrationModal(true);
                  }}
                  {...(integration.slug === "stripe" && {
                    disabledTooltip: (
                      <TooltipContent
                        title="You cannot uninstall the Stripe integration from here. Please visit the Stripe dashboard to uninstall the app."
                        cta="Go to Stripe"
                        href="https://dashboard.stripe.com/settings/apps/dub.co"
                        target="_blank"
                      />
                    ),
                  })}
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
                "border-gray-200 bg-white text-gray-900 placeholder-gray-400",
                "focus-visible:border-gray-500 data-[state=open]:border-gray-500 data-[state=open]:ring-4 data-[state=open]:ring-gray-200",
              )}
            >
              <ThreeDots className="h-5 w-5 text-gray-500" />
            </button>
          </Popover>
        )}
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:gap-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-12">
          {integration.installed && (
            <div className="flex items-center gap-2">
              <Avatar user={integration.installed.by} className="size-8" />
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-500">INSTALLED BY</p>
                <p className="text-sm font-medium text-gray-700">
                  {integration.installed.by.name}
                  <span className="ml-1 font-normal text-gray-500">
                    {formatDate(integration.installed.createdAt, {
                      year: undefined,
                    })}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-500">DEVELOPER</p>
            <div className="flex items-center gap-x-1 text-sm font-medium text-gray-700">
              <OfficeBuilding className="size-3" />
              {integration.developer}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-gray-500">WEBSITE</p>
            <a
              href={integration.website}
              className="flex items-center gap-x-1 text-sm font-medium text-gray-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe className="size-3" />
              {getPrettyUrl(integration.website)}
            </a>
          </div>
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
          {!integration.installed && (
            <Button
              onClick={() => {
                const { installUrl } = integration;

                if (installUrl) {
                  // open in a new tab
                  window.open(installUrl, "_blank");
                  return;
                }

                getInstallationUrl.execute({
                  workspaceId: workspaceId!,
                  integrationSlug: integration.slug,
                });
              }}
              loading={getInstallationUrl.isExecuting}
              text="Enable"
              variant="primary"
              icon={<ConnectedDots className="size-4" />}
              {...(integration.id === STRIPE_INTEGRATION_ID &&
                !conversionEnabled && {
                  disabledTooltip: (
                    <TooltipContent
                      title="To use this integration, you need to have Dub Conversions enabled for your workspace."
                      cta="Learn more"
                      href="https://d.to/conversions"
                      target="_blank"
                    />
                  ),
                })}
            />
          )}
        </div>
      </div>

      <div className="w-full rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-gray-200 px-6 py-4">
          <BookOpenText className="size-4" />
          <p className="text-sm font-medium text-gray-700">Overview</p>
        </div>

        {integration.screenshots && integration.screenshots.length > 0 ? (
          <Carousel autoplay={{ delay: 5000 }} className="bg-white p-8">
            <CarouselContent>
              {integration.screenshots.map((src, idx) => (
                <CarouselItem key={idx}>
                  <BlurImage
                    src={src}
                    alt={`Screenshot of ${integration.name}`}
                    width={2880}
                    height={1640}
                    className="aspect-[2880/1640] w-[5/6] overflow-hidden rounded-md border border-gray-200 object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNavBar variant="floating" />
          </Carousel>
        ) : null}

        {integration.readme && (
          <Markdown
            className={cn(
              "prose prose-sm prose-gray max-w-none p-6 transition-all",
              "prose-headings:leading-tight",
              "prose-a:font-medium prose-a:text-gray-500 prose-a:underline-offset-4 hover:prose-a:text-black",
            )}
            components={{
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {integration.readme}
          </Markdown>
        )}
      </div>
    </MaxWidthWrapper>
  );
}
