"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import {
  Badge,
  Button,
  CircleCheckFill,
  FileUpload,
  Input,
  useMediaQuery,
} from "@dub/ui";
import { cn, getDomainWithoutWWW } from "@dub/utils";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { toast } from "sonner";

export function Form() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { activeWorkspaceDomains, loading } = useDomains();
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const [hasSubmitted, setHasSubmitted] = useState(false);

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

  const [isUploading, setIsUploading] = useState(false);

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

      if (!response.ok) throw new Error("Failed to get signed URL for upload.");

      const { signedUrl, destinationUrl } = await response.json();

      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "Content-Length": file.size.toString(),
        },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload to signed URL");

      setValue("logo", destinationUrl, { shouldDirty: true });
      console.log(destinationUrl);
      toast.success(`${file.name} uploaded!`);
    } catch (e) {
      toast.error("Failed to upload logo");
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const [name, url, domain, logo] = watch(["name", "url", "domain", "logo"]);

  const buttonDisabled =
    isSubmitting || isPending || !name || !url || !domain || !logo;

  const LINK_TYPES = [
    {
      id: "short",
      label: "Short link",
      example: `${domain || "refer.dub.co"}/steven`,
      comingSoon: false,
    },
    {
      id: "dynamic",
      label: "Dynamic path",
      example: `${(url && getDomainWithoutWWW(url)) || "dub.co"}/refer/steven`,
      comingSoon: true,
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Program name
        </label>
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
            Set the default referral link domain and destination URL
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">
            Default domain
          </label>
          {loading ? (
            <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-neutral-100" />
          ) : (
            <select
              {...register("domain", { required: true })}
              className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
            >
              {activeWorkspaceDomains?.map(({ slug }) => (
                <option value={slug} key={slug}>
                  {slug}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800">
            Destination URL
          </label>
          <Input
            {...register("url", { required: true })}
            type="url"
            placeholder="https://dub.co"
            className={"mt-2 max-w-full"}
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">Link type</h2>
          <p className="text-sm font-normal text-neutral-600">
            Set how the link shows up in the partner portal
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {LINK_TYPES.map((type) => {
            const isSelected = watch("linkType") === type.id;

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
                  {...register("linkType")}
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
        </div>
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
