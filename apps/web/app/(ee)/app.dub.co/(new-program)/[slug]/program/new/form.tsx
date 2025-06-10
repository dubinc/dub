"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { ProgramLinkConfiguration } from "@/ui/partners/program-link-configuration";
import { Button, FileUpload, Input, useMediaQuery } from "@dub/ui";
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

  const [name, url, domain, logo] = watch(["name", "url", "domain", "logo"]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/rewards`);
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
        `/api/workspaces/${workspaceId}/upload-url`,
        {
          method: "POST",
          body: JSON.stringify({
            folder: "program-logos",
          }),
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Company name
        </label>
        <p className="mb-4 mt-1 text-sm text-neutral-600">
          The name of your company
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

        <ProgramLinkConfiguration
          domain={domain}
          url={url}
          onDomainChange={(domain) =>
            setValue("domain", domain, { shouldDirty: true })
          }
          onUrlChange={(url) => setValue("url", url, { shouldDirty: true })}
        />
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
