"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import { updateGroupSchema } from "@/lib/zod/schemas/groups";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.input<typeof updateGroupSchema>;

export function GroupSettings() {
  const router = useRouter();
  const { program } = useProgram();
  const { groupSlug, slug } = useParams<{ groupSlug: string; slug: string }>();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const { group } = useGroup({
    groupIdOrSlug: groupSlug,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: "onBlur",
  });

  // Reset form when group data loads
  React.useEffect(() => {
    if (group) {
      reset({
        name: group.name,
        slug: group.slug,
        color: group.color || "",
      });
    }
  }, [group, reset]);

  const onSubmit = async (data: FormData) => {
    if (!group) {
      return;
    }

    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: () => {
        toast.success("Group updated successfully!");

        // If slug changed, redirect to new URL
        if (data.slug !== group.slug) {
          router.push(`/${slug}/program/partners/groups/${data.slug}`);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Settings</h2>
        <p className="text-sm text-neutral-500">
          Manage your group settings and configuration.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="text-sm font-medium text-neutral-800"
          >
            Name
          </label>
          <div className="mt-2">
            <div className="relative">
              <input
                type="text"
                id="name"
                className={cn(
                  "block w-full rounded-md border-neutral-300 px-3 py-2 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.name &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("name", {
                  required: true,
                })}
                onChange={(e) => {
                  const name = e.target.value;
                  setValue("name", name, { shouldDirty: true });
                  setValue("slug", slugify(name), { shouldDirty: true });
                }}
                placeholder="Group name"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <div className="relative">
                  <div
                    className="h-6 w-6 cursor-pointer rounded-full border-none"
                    style={{
                      backgroundColor: watch("color") || "",
                    }}
                    onClick={() =>
                      document.getElementById("color-picker")?.click()
                    }
                  />
                  <input
                    id="color-picker"
                    type="color"
                    {...register("color", {
                      required: true,
                    })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    title="Choose group color"
                  />
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-neutral-500">
              For internal use only, never visible to partners
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="slug"
            className="text-sm font-medium text-neutral-800"
          >
            Landing page slug
          </label>
          <div className="mt-2">
            <div className="flex">
              <div className="flex items-center rounded-l-md border-y border-l border-neutral-300 px-3 py-2 text-sm text-neutral-800">
                partners.dub.co/{program?.slug}
              </div>
              <input
                type="text"
                id="slug"
                className={cn(
                  "block w-full rounded-r-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.slug &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("slug", {
                  required: true,
                })}
                placeholder="group-name"
              />
            </div>

            <p className="mt-2 text-xs text-neutral-500">
              For both internal and external use
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="submit"
            variant="primary"
            text="Save changes"
            className="w-fit"
            loading={isSubmitting}
            disabled={!isDirty}
          />
        </div>
      </form>
    </div>
  );
}
