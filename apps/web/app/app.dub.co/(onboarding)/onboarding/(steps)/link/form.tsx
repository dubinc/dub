"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { ShortLinkInput } from "@/ui/links/short-link-input";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

type FormData = {
  url: string;
  link: {
    domain: string;
    key: string;
  };
};

export function Form() {
  const router = useRouter();

  const { id: workspaceId, nextPlan, slug } = useWorkspace();

  const { domains, loading, primaryDomain } = useAvailableDomains();

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

  return (
    <form
      className="flex w-full flex-col gap-y-4"
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
          return;
        }

        await mutate(
          (key) => typeof key === "string" && key.startsWith("/api/links"),
          undefined,
          { revalidate: true },
        );
        const result = await res.json();
        posthog.capture("link_created", result);

        router.push(`/onboarding/domain?slug=${slug}`);
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
      <Button
        type="submit"
        text="Create link"
        loading={isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
