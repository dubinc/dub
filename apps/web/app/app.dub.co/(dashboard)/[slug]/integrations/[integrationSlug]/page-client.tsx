"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { IntegrationPageProps } from "@/lib/types";
import { useUninstallIntegrationModal } from "@/ui/modals/uninstall-integration-modal";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Avatar,
  BlurImage,
  Button,
  MaxWidthWrapper,
  Popover,
  TokenAvatar,
} from "@dub/ui";
import { Globe, OfficeBuilding } from "@dub/ui/src/icons";
import { cn, formatDate, getPrettyUrl } from "@dub/utils";
import { ChevronLeft, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function IntegrationPageClient({
  integration,
}: {
  integration: IntegrationPageProps;
}) {
  const { slug } = useWorkspace();

  const [openPopover, setOpenPopover] = useState(false);

  const { UninstallIntegrationModal, setShowUninstallIntegrationModal } =
    useUninstallIntegrationModal({
      integration: integration,
    });

  return (
    <MaxWidthWrapper className="my-10 grid max-w-screen-lg gap-8">
      {integration.installed && <UninstallIntegrationModal />}
      <Link
        href={`/${slug}/integrations`}
        className="flex items-center gap-x-1"
      >
        <ChevronLeft className="size-4" />
        <p className="text-sm font-medium text-gray-500">Integrations</p>
      </Link>
      <div className="flex justify-between">
        <div className="flex items-center gap-x-3">
          <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
            {integration.logo ? (
              <BlurImage
                src={integration.logo}
                alt={`Logo for ${integration.name}`}
                className="size-8 rounded-full border border-gray-200"
                width={20}
                height={20}
              />
            ) : (
              <TokenAvatar id={integration.clientId} className="size-8" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700">{integration.name}</p>
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
                  icon={<Trash className="h-4 w-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setShowUninstallIntegrationModal(true);
                  }}
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
      <div className="flex gap-12 rounded-lg border border-gray-200 bg-white p-4">
        {integration.installed && (
          <div className="flex items-center gap-2">
            <Avatar user={integration.installed.by} className="size-8" />
            <div>
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
        <div>
          <p className="text-xs text-gray-500">DEVELOPER</p>
          <div className="flex items-center gap-x-1 text-sm font-medium text-gray-700">
            <OfficeBuilding className="size-4" />
            {integration.developer}
          </div>
        </div>
        <div>
          <p className="text-gray-5000 text-xs">WEBSITE</p>
          <a
            href={integration.website}
            className="flex items-center gap-x-1 text-sm font-medium text-gray-700"
          >
            <Globe className="size-4" />
            {getPrettyUrl(integration.website)}
          </a>
        </div>
      </div>
    </MaxWidthWrapper>
  );
}
