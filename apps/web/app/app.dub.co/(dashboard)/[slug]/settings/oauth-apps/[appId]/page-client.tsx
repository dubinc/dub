"use client";

import { generateClientSecret } from "@/lib/actions/generate-client-secret";
import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { useRemoveOAuthAppModal } from "@/ui/modals/remove-oauth-app-modal";
import { useSubmitOAuthAppModal } from "@/ui/modals/submit-oauth-app-modal";
import AddOAuthAppForm from "@/ui/oauth-apps/add-edit-app-form";
import OAuthAppCredentials from "@/ui/oauth-apps/oauth-app-credentials";
import { ThreeDots } from "@/ui/shared/icons";
import {
  BlurImage,
  Button,
  MaxWidthWrapper,
  Popover,
  TokenAvatar,
} from "@dub/ui";
import { fetcher } from "@dub/utils";
import { ChevronLeft, RefreshCcw, Trash, Upload } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

export default function OAuthAppManagePageClient({ appId }: { appId: string }) {
  const searchParams = useSearchParams();
  const { slug, id: workspaceId, role } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { executeAsync, result, isExecuting } = useAction(
    generateClientSecret,
    {
      onSuccess: () => {
        toast.success("New client secret generated.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError?.serverError);
      },
    },
  );

  const { data: oAuthApp, isLoading } = useSWR<OAuthAppProps>(
    `/api/oauth/apps/${appId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { RemoveOAuthAppModal, setShowRemoveOAuthAppModal } =
    useRemoveOAuthAppModal({
      oAuthApp,
    });

  const { SubmitOAuthAppModal, setShowSubmitOAuthAppModal } =
    useSubmitOAuthAppModal({
      oAuthApp,
    });

  const { error: permissionsError } = clientAccessCheck({
    action: "oauth_apps.write",
    role,
  });

  if (!isLoading && !oAuthApp) {
    notFound();
  }

  return (
    <>
      <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
        <RemoveOAuthAppModal />
        <SubmitOAuthAppModal />
        <Link
          href={`/${slug}/settings/oauth-apps`}
          className="flex items-center gap-x-1"
        >
          <ChevronLeft className="size-4" />
          <p className="text-sm font-medium text-gray-500">
            Back to OAuth Apps
          </p>
        </Link>
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="flex items-center gap-x-3">
              <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                <TokenAvatar id="placeholder-oauth-app" className="size-8" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-20 rounded-full bg-gray-100"></div>
                <div className="h-3 w-80 rounded-full bg-gray-100"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-x-3">
              <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
                {oAuthApp?.logo ? (
                  <BlurImage
                    src={oAuthApp.logo}
                    alt={`Logo for ${oAuthApp.name}`}
                    className="size-8 rounded-full border border-gray-200"
                    width={20}
                    height={20}
                  />
                ) : (
                  <TokenAvatar id={oAuthApp?.clientId!} className="size-8" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">{oAuthApp?.name}</p>
                <p className="text-sm text-gray-500">{oAuthApp?.description}</p>
              </div>
            </div>
          )}

          <Popover
            content={
              <div className="grid w-screen gap-px p-2 sm:w-48">
                <Button
                  text={isExecuting ? "Regenerating..." : "Regenerate secret"}
                  variant="outline"
                  icon={<RefreshCcw className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                  disabled={isExecuting}
                  onClick={async () => {
                    await executeAsync({
                      workspaceId: workspaceId!,
                      appId,
                    });
                    setOpenPopover(false);
                  }}
                />
                {!oAuthApp?.verified && (
                  <Button
                    text="Submit for review"
                    variant="outline"
                    icon={<Upload className="h-4 w-4" />}
                    className="h-9 justify-start px-2"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowSubmitOAuthAppModal(true);
                    }}
                  />
                )}
                <Button
                  text="Remove application"
                  variant="danger-outline"
                  icon={<Trash className="h-4 w-4" />}
                  className="h-9 justify-start px-2"
                  onClick={() => {
                    setShowRemoveOAuthAppModal(true);
                  }}
                />
              </div>
            }
            align="end"
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          >
            <Button
              variant="outline"
              className="flex w-8 rounded-md border border-gray-200 px-2 transition-[border-color] duration-200"
              icon={<ThreeDots className="h-5 w-5 shrink-0 text-gray-500" />}
              onClick={() => setOpenPopover(!openPopover)}
              {...(permissionsError && {
                disabledTooltip: permissionsError,
              })}
            />
          </Popover>
        </div>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        {oAuthApp && (
          <>
            <OAuthAppCredentials
              clientId={oAuthApp.clientId}
              clientSecret={
                result.data?.clientSecret ||
                searchParams.get("client_secret") ||
                null
              }
              partialClientSecret={oAuthApp.partialClientSecret}
            />
            <hr />
            <AddOAuthAppForm oAuthApp={oAuthApp} />
          </>
        )}
      </MaxWidthWrapper>
    </>
  );
}
