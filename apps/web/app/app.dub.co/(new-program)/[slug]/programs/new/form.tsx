"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
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
import { getApexDomain } from "@dub/utils";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";

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

  const [name, url, domain, logo] = watch(["name", "url", "domain", "logo"]);

  const buttonDisabled =
    isSubmitting || isPending || !name || !url || !domain || !logo;

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
          className={"mt-2 max-w-full"}
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
            Your custom domain dedicated to shortlink use on Dub
          </p>
        </div>

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
            Where you're sending people when they click the partner link above
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-base font-medium text-neutral-900">
          Partner preview
        </h2>

        <div className="rounded-2xl bg-neutral-50 p-2">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="relative flex shrink-0 items-center">
              <div className="absolute inset-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-neutral-200">
                <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
              </div>
              <div className="relative z-10 p-2">
                <LinkLogo
                  apexDomain={getApexDomain(url || "https://dub.co")}
                  className="size-4 sm:size-6"
                  imageProps={{
                    loading: "lazy",
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-neutral-700">
                {domain
                  ? `${domain}/${name?.toLowerCase().replace(/\s/g, "")}`
                  : "refer.acme.co/steven"}
              </div>
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                <span className="truncate">{url || "acme.co"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="flex flex-col gap-3">
          {getLinkStructureOptions({
            domain,
            url,
          }).map((type) => {
            const isSelected = watch("linkStructure") === type.id;

            return (
              <label
                key={type.id}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  type.comingSoon && "cursor-not-allowed hover:bg-white",
                )}
              >
                <input
                  type="radio"
                  {...register("linkStructure")}
                  value={type.id}
                  className="hidden"
                  disabled={type.comingSoon}
                />

                <div className="flex grow flex-col text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">
                      {type.label}
                    </span>
                    {type.comingSoon && (
                      <Badge variant="blueGradient" size="sm">
                        Coming soon
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-normal text-neutral-900">
                    {type.example}
                  </span>
                </div>

                {!type.comingSoon && (
                  <CircleCheckFill
                    className={cn(
                      "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                      isSelected && "scale-100 opacity-100",
                    )}
                  />
                )}
              </label>
            );
          })}
        </div> */}
      </div>

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
