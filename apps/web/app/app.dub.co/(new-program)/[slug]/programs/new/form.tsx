"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps, ProgramData } from "@/lib/types";
import DomainConfiguration from "@/ui/domains/domain-configuration";
import { DomainSelector } from "@/ui/domains/domain-selector";
import {
  Button,
  FileUpload,
  InfoTooltip,
  Input,
  LinkLogo,
  SimpleTooltipContent,
  useMediaQuery,
} from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/icons";
import { fetcher, getApexDomain, getPrettyUrl } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";

export function Form() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const [isUploading, setIsUploading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const [name, url, domain, logo] = watch(["name", "url", "domain", "logo"]);

  const { data: verificationData } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId && domain
      ? `/api/domains/${domain}/verify?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/programs/new/rewards`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
      setHasSubmitted(false);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) return;

    setHasSubmitted(true);
    await executeAsync({
      ...data,
      workspaceId,
      step: "get-started",
    });
  };

  // Handle logo upload
  const handleUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/programs/upload-logo`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get signed URL for upload.");
      }

      const { signedUrl, destinationUrl } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to signed URL");
      }

      setValue("logo", destinationUrl, { shouldDirty: true });
      toast.success(`${file.name} uploaded!`);
    } catch (e) {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const buttonDisabled =
    isSubmitting || isPending || !name || !url || !domain || !logo;

  const linkStructureOptions = getLinkStructureOptions({
    domain,
    url,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Company name
        </label>
        <p className="mb-4 mt-1 text-sm text-neutral-600">
          The name of the company you're setting up the program for
        </p>
        <Input
          {...register("name", { required: true })}
          placeholder="Acme"
          autoFocus={!isMobile}
          className="mt-2 max-w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Logo
        </label>
        <p className="mb-4 mt-1 text-sm text-neutral-600">
          A square logo that will be used in various parts of your program
        </p>
        <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 p-1">
          <Controller
            control={control}
            name="logo"
            rules={{ required: true }}
            render={({ field }) => (
              <FileUpload
                accept="images"
                className="size-14 rounded-lg"
                iconClassName="size-4 text-neutral-800"
                icon={Plus}
                variant="plain"
                loading={isUploading}
                imageSrc={field.value}
                readFile
                onChange={({ file }) => handleUpload(file)}
                content={null}
                maxFileSizeMB={2}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">
            Referral link
          </h2>
          <p className="text-sm font-normal text-neutral-600">
            Set the custom domain and destination URL for your referral links
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-x-2">
            <label className="block text-sm font-medium text-neutral-800">
              Custom domain
            </label>

            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="A connected domain or sub-domain is required to create a program."
                  cta="Learn more"
                  href="https://dub.co/help/article/choosing-a-custom-domain"
                />
              }
            />
          </div>

          <DomainSelector
            selectedDomain={domain}
            setSelectedDomain={(domain) => setValue("domain", domain)}
          />

          <p className="text-xs font-normal text-neutral-500">
            Custom domain that will be used for your program's referral links
          </p>
        </div>

        <AnimatePresence>
          {domain &&
            verificationData &&
            verificationData.status !== "Valid Configuration" && (
              <motion.div
                key="domain-verification"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-6 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-5 pb-5"
              >
                <DomainConfiguration data={verificationData} />
              </motion.div>
            )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-800">
            Destination URL
          </label>
          <Input
            {...register("url", { required: true })}
            type="url"
            placeholder="https://dub.co"
            className="max-w-full"
          />
          <p className="text-xs font-normal text-neutral-500">
            Where people will be redirected to when they click on your program's
            referral links
          </p>
        </div>
      </div>

      <AnimatePresence>
        {domain && (
          <motion.div
            key="referral-link-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-base font-medium text-neutral-900">
              Referral link preview
            </h2>

            <div className="rounded-2xl bg-neutral-50 p-2">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="relative flex shrink-0 items-center">
                  <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
                    <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                  </div>
                  <div className="relative z-10 p-2">
                    {url ? (
                      <LinkLogo
                        apexDomain={getApexDomain(url)}
                        className="size-4 sm:size-6"
                        imageProps={{
                          loading: "lazy",
                        }}
                      />
                    ) : (
                      <div className="size-4 rounded-full bg-neutral-200 sm:size-6" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="truncate text-sm font-medium text-neutral-700">
                    {linkStructureOptions?.[0].example}
                  </div>

                  <div className="flex min-h-[20px] items-center gap-1 text-sm text-neutral-500">
                    {url ? (
                      <>
                        <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                        <span className="truncate">{getPrettyUrl(url)}</span>
                      </>
                    ) : (
                      <div className="h-3 w-1/2 rounded-md bg-neutral-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting || isPending || hasSubmitted}
        disabled={buttonDisabled}
        type="submit"
      />
    </form>
  );
}
