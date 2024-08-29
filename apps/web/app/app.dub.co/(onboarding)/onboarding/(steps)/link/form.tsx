"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { ShortLinkInput } from "@/ui/links/short-link-input";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import { Button } from "@dub/ui";
import { LoadingCircle, Photo } from "@dub/ui/src/icons";
import { getUrlWithoutUTMParams } from "@dub/utils";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import { useOnboardingProgress } from "../../use-onboarding-progress";

type FormData = {
  url: string;
  link: {
    domain: string;
    key: string;
  };
};

export function Form() {
  const { continueTo } = useOnboardingProgress();

  const { id: workspaceId, nextPlan, slug } = useWorkspace();

  const { domains, loading, primaryDomain } = useAvailableDomains();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingPreviewImage, setLoadingPreviewImage] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    defaultValues: {
      url: "",
      link: {
        domain: "",
        key: "",
      },
    },
  });

  const url = watch("url");
  const link = watch("link");

  useEffect(() => {
    if (!loading && primaryDomain && !link.domain) {
      setValue("link", { ...link, domain: primaryDomain });
    }
  }, [loading, primaryDomain, setValue, link]);

  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);

  useEffect(() => {
    if (debouncedUrl) {
      try {
        // If url is valid, continue to generate metatags, else return null
        new URL(debouncedUrl);
        setLoadingPreviewImage(true);
        fetch(`/api/metatags?url=${debouncedUrl}`).then(async (res) => {
          if (res.ok) {
            const results = await res.json();
            setPreviewImage(results.image);
          }
        });
      } catch (_) {
        setPreviewImage(null);
      } finally {
        // Timeout to prevent flickering
        setTimeout(() => setLoadingPreviewImage(false), 200);
      }
    }
  }, [debouncedUrl]);

  return (
    <form
      className="flex w-full flex-col gap-y-6"
      onSubmit={handleSubmit(async (data) => {
        if (!workspaceId) {
          toast.error("Failed to get workspace data.");
          return;
        }

        const {
          url,
          link: { domain, key },
        } = data;

        const res = await fetch(`/api/links?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, domain, key }),
        });

        if (!res.ok) {
          const { error } = await res.json();
          if (error) {
            if (error.message.includes("Upgrade to")) {
              toast.custom(() => (
                <UpgradeRequiredToast
                  title={`You've discovered a ${nextPlan.name} feature!`}
                  message={error.message}
                />
              ));
            } else {
              toast.error(error.message);
            }
          }
          throw new Error(error);
        }

        await mutate(
          (key) => typeof key === "string" && key.startsWith("/api/links"),
          undefined,
          { revalidate: true },
        );
        const result = await res.json();
        posthog.capture("link_created", result);

        continueTo("domain");
      })}
    >
      <DestinationUrlInput domains={domains} {...register("url")} />
      <Controller
        control={control}
        name="link"
        render={({ field }) => (
          <ShortLinkInput
            onChange={(d) => field.onChange({ ...field.value, ...d })}
            domain={link.domain}
            _key={link.key}
            data={{ url, title: "", description: "" }}
            saving={isSubmitting}
            loading={loading}
            domains={domains}
          />
        )}
      />
      <div className="flex flex-col gap-2">
        <span className="block text-sm font-medium text-gray-700">
          Link Preview
        </span>
        <div className="relative aspect-[1.91/1] w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100">
          {previewImage ? (
            <img
              src={previewImage}
              alt="Preview"
              className="size-full rounded-[inherit] object-cover"
            />
          ) : loadingPreviewImage ? (
            <div className="absolute inset-0 z-[5] flex items-center justify-center rounded-[inherit] bg-white">
              <LoadingCircle />
            </div>
          ) : (
            <div className="flex size-full flex-col items-center justify-center space-y-4 bg-white">
              <Photo className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-400">
                Enter a link to generate a preview.
              </p>
            </div>
          )}
        </div>
      </div>
      <Button
        type="submit"
        text="Create link"
        loading={isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
