"use client";

import { getIntegrationInstallUrl } from "@/lib/actions/get-integration-install-url";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { GOOGLE_ADS_DEFAULT_SETTINGS } from "../constants";
import {
  type GoogleAdsSettingsFormData,
  googleAdsSettingsSchema,
} from "../schema";
import { updateGoogleAdsSettingsAction } from "../update-google-ads-settings";

export const GoogleAdsSettings = ({
  installed,
  settings,
  slug,
}: InstalledIntegrationInfoProps) => {
  const router = useRouter();
  const { id: workspaceId } = useWorkspace();

  const googleAdsSettings = googleAdsSettingsSchema.parse({
    ...GOOGLE_ADS_DEFAULT_SETTINGS,
    ...(settings as z.infer<typeof googleAdsSettingsSchema>),
  });

  const { register, handleSubmit, reset } = useForm<GoogleAdsSettingsFormData>({
    defaultValues: {
      leadConversionActionId: googleAdsSettings.leadConversionActionId ?? "",
      saleConversionActionId: googleAdsSettings.saleConversionActionId ?? "",
    },
  });

  const { executeAsync, isPending } = useAction(updateGoogleAdsSettingsAction, {
    onSuccess({ input }) {
      reset({
        leadConversionActionId: input.leadConversionActionId ?? "",
        saleConversionActionId: input.saleConversionActionId ?? "",
      });
      router.refresh();
      toast.success("Google Ads settings updated successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update Google Ads settings.");
    },
  });

  const { execute: executeReauth, isPending: isReauthPending } = useAction(
    getIntegrationInstallUrl,
    {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          throw new Error("Error getting installation URL");
        }

        window.location.href = data.url;
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to start Google Ads re-auth.");
      },
    },
  );

  const onSubmit = handleSubmit(async (data) => {
    if (!workspaceId) {
      return;
    }

    await executeAsync({
      workspaceId,
      leadConversionActionId: data.leadConversionActionId.trim() || null,
      saleConversionActionId: data.saleConversionActionId.trim() || null,
    });
  });

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            Google Ads Integration Settings
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Offline conversions are uploaded when a Dub lead or sale has a gclid
            on the short link URL. Append{" "}
            <code className="text-xs">?gclid=&#123;gclid&#125;</code> to your
            Dub links in Google Ads.
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Google Ads Customer ID
            </label>
            <Input
              className="max-w-none font-mono"
              value={googleAdsSettings.customerId ?? ""}
              readOnly
              disabled
            />
            <p className="mt-1 text-xs text-neutral-400">
              To connect a different Google Ads account, re-authenticate below.
            </p>
            <Button
              type="button"
              variant="secondary"
              text="Change Google Ads account"
              className="mt-2 h-8 w-fit"
              loading={isReauthPending}
              onClick={() => {
                if (!workspaceId) {
                  return;
                }

                executeReauth({
                  workspaceId,
                  integrationSlug: slug,
                });
              }}
            />
          </div>

          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Lead conversion action ID
            </label>
            <Input
              className="max-w-none font-mono"
              placeholder="e.g. 1234567890"
              {...register("leadConversionActionId")}
            />
            <p className="mt-1 text-xs text-neutral-400">
              In Google Ads → Goals → Conversions, create an &quot;Import from
              clicks&quot; action and paste its ID here.
            </p>
          </div>

          <div>
            <label className="text-content-subtle mb-1 block text-xs font-medium">
              Sale conversion action ID
            </label>
            <Input
              className="max-w-none font-mono"
              placeholder="e.g. 1234567890"
              {...register("saleConversionActionId")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <Button
            type="submit"
            variant="primary"
            text="Save changes"
            className="h-8 w-fit"
            loading={isPending}
          />
        </div>
      </div>
    </form>
  );
};
