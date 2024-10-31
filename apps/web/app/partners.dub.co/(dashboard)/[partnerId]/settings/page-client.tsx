"use client";

import { updatePartnerProfile } from "@/lib/actions/partners/update-partner-profile";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import {
  Button,
  buttonVariants,
  FileUpload,
  LoadingSpinner,
  MaxWidthWrapper,
} from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useParams } from "next/navigation";
import { PropsWithChildren } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactTextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

export function ProfileSettingsPageClient() {
  const { partner, error } = usePartnerProfile();

  return (
    <MaxWidthWrapper>
      <div className="max-w-screen-md rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-6">
          <h2 className="text-xl font-medium text-neutral-800">About you</h2>
        </div>
        {partner ? (
          <ProfileForm partner={partner} />
        ) : (
          <div className="flex h-32 w-full items-center justify-center">
            {error ? (
              <span className="text-sm text-neutral-500">
                Failed to load profile data
              </span>
            ) : (
              <LoadingSpinner />
            )}
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
}

function ProfileForm({ partner }: { partner: PartnerProps }) {
  const { partnerId } = useParams() as { partnerId: string };
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<{
    name: string;
    logo: string | null;
    description: string | null;
  }>({
    defaultValues: {
      name: partner.name,
      logo: partner.logo,
      description: partner.bio,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const result = await updatePartnerProfile({ ...data, partnerId });
          if (!result?.data?.ok) throw new Error("Failed to save profile");
          toast.success("Profile updated successfully");
        } catch (error) {
          console.error(error);
          setError("root.serverError", {
            message: "Failed to save profile. Please try again.",
          });
          toast.error("Failed to save profile. Please try again.");
        }
      })}
    >
      <div className="px-5">
        <div className="grid grid-cols-2 items-center">
          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-gray-800">Logo</span>
              <div className="flex items-center gap-5">
                <Controller
                  control={control}
                  name="logo"
                  render={({ field }) => (
                    <FileUpload
                      accept="images"
                      className="mt-2 size-14 rounded-full border border-gray-300"
                      iconClassName="w-5 h-5"
                      previewClassName="size-14 rounded-full"
                      variant="plain"
                      imageSrc={
                        field.value || `${DICEBEAR_AVATAR_URL}${partner?.name}`
                      }
                      readFile
                      onChange={({ src }) => field.onChange(src)}
                      content={null}
                      maxFileSizeMB={2}
                    />
                  )}
                />
                <div>
                  <div
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "flex h-7 w-fit cursor-pointer items-center rounded-md border px-2 text-xs",
                    )}
                  >
                    Upload image
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Recommended size: 160x160px
                  </p>
                </div>
              </div>
            </label>
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-gray-800">Name</span>
              <div>
                <input
                  type="text"
                  className={cn(
                    "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                    errors.name
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
                  )}
                  placeholder="Acme, Inc."
                  {...register("name", {
                    required: true,
                  })}
                />
              </div>
            </label>
          </FormRow>

          <FormRow>
            <label className="contents">
              <span className="text-sm font-medium text-gray-800">
                Description
              </span>
              <div>
                <ReactTextareaAutosize
                  className={cn(
                    "mt-2 block w-full rounded-md focus:outline-none sm:text-sm",
                    errors.name
                      ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500",
                  )}
                  placeholder="Tell us about your business"
                  minRows={3}
                  maxRows={10}
                  {...register("description")}
                />
              </div>
            </label>
          </FormRow>
        </div>
      </div>
      <div className="flex justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-100 px-5 py-3.5">
        <Button
          type="submit"
          text="Save changes"
          className="h-8 w-fit px-2.5"
          loading={isSubmitting}
        />
      </div>
    </form>
  );
}

function FormRow({ children }: PropsWithChildren) {
  return (
    <div className="blah contents [&:not(:last-child)>label>*]:border-b [&>label>*]:flex [&>label>*]:h-full [&>label>*]:items-center [&>label>*]:border-neutral-200 [&>label>*]:py-5">
      {children}
    </div>
  );
}
