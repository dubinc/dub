"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { Button, FileUpload, Input, useMediaQuery } from "@dub/ui";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useOnboardingProgress } from "../../use-onboarding-progress";

export function Form() {
  const { isMobile } = useMediaQuery();
  const [isUploading, setIsUploading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, mutate } = useWorkspace();

  const { continueTo } = useOnboardingProgress();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting, errors },
  } = useFormContext<ProgramData>();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      continueTo("program/reward");
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError as string);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <label className="space-y-2">
        <span className="text-content-emphasis block text-sm font-semibold">
          Company name
        </span>

        <Input
          {...register("name", { required: true })}
          placeholder="Acme, Inc."
          autoFocus={!isMobile}
          className="max-w-full"
          error={errors.name?.message}
        />

        <p className="text-content-subtle text-xs">
          This will used as your program's public name
        </p>
      </label>

      <label className="space-y-2">
        <span className="text-content-emphasis block text-sm font-semibold">
          Logo
        </span>

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

        <p className="text-content-subtle text-xs">
          Recommended size: 160&times;160px
        </p>
      </label>

      <label className="space-y-2">
        <span className="text-content-emphasis block text-sm font-semibold">
          Destination URL
        </span>

        <Controller
          control={control}
          name="url"
          render={({ field }) => (
            <Input
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value)}
              type="url"
              placeholder="https://"
              className="max-w-full"
              error={errors.url?.message}
            />
          )}
        />

        <p className="text-content-subtle text-xs">
          Where customers will be redirected to when they click on your
          partners' referral links
        </p>
      </label>

      <label className="space-y-2">
        <span className="text-content-emphasis block text-sm font-semibold">
          Support email
        </span>

        <Controller
          control={control}
          name="supportEmail"
          render={({ field }) => (
            <Input
              value={field.value || ""}
              onChange={(e) => field.onChange(e.target.value)}
              type="email"
              className="max-w-full"
              error={errors.supportEmail?.message}
            />
          )}
        />

        <p className="text-content-subtle text-xs">
          Displayed to your partners on their dashboard
        </p>
      </label>

      <Button
        type="submit"
        loading={isSubmitting || isPending || hasSubmitted}
        text="Continue"
        className="w-full"
      />
    </form>
  );
}
