"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupProps } from "@/lib/types";
import {
  DEFAULT_PARTNER_GROUP,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { GroupColorPicker } from "@/ui/partners/groups/group-color-picker";
import { Button, CopyButton } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type FormData = z.input<typeof updateGroupSchema>;

export function GroupSettings() {
  const { group, loading } = useGroup();

  if (!group || loading) {
    return <GroupSettingsFormSkeleton />;
  }

  return <GroupSettingsForm group={group} />;
}

function GroupSettingsForm({ group }: { group: GroupProps }) {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    mode: "onBlur",
    defaultValues: {
      name: group.name,
      slug: group.slug,
      color: group.color,
    },
  });

  const onSubmit = async (data: FormData) => {
    await updateGroup(`/api/groups/${group.id}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        await mutatePrefix("/api/groups");
        // If slug changed, redirect to new URL
        if (data.slug !== group.slug) {
          router.push(`/${slug}/program/groups/${data.slug}/settings`);
        }
        toast.success("Group updated successfully!");
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-neutral-200"
    >
      <div className="px-5 py-5">
        <h2 className="mb-4 text-base font-bold text-neutral-900">Settings</h2>
        <div className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-neutral-800"
            >
              Group name
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

                    if (group.slug !== DEFAULT_PARTNER_GROUP.slug) {
                      setValue("slug", slugify(name), { shouldDirty: true });
                    }
                  }}
                  placeholder="Group name"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <Controller
                    control={control}
                    name="color"
                    render={({ field }) => (
                      <GroupColorPicker
                        color={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                For internal use only, never visible to partners
              </p>
            </div>
          </div>

          {group.slug !== DEFAULT_PARTNER_GROUP.slug && (
            <div>
              <label
                htmlFor="slug"
                className="text-sm font-medium text-neutral-800"
              >
                Group slug
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="slug"
                  className={cn(
                    "block w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.slug &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("slug", {
                    required: true,
                  })}
                  placeholder="group-name"
                />

                <p className="mt-2 text-xs text-neutral-500">
                  For program landing page and internal group page URLs
                </p>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="slug"
              className="text-sm font-medium text-neutral-800"
            >
              Group ID
            </label>
            <div className="mt-2">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  className="block w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 pr-12 font-mono text-sm text-neutral-600 focus:border-neutral-300 focus:ring-0"
                  defaultValue={group.id}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                  <CopyButton
                    value={group.id}
                    onCopy={() => {
                      toast.success("Group ID copied to clipboard!");
                    }}
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                For setting up the Dub embedded referral dashboard within your
                app.{" "}
                <Link
                  href="https://dub.co/docs/partners/embedded-referrals"
                  target="_blank"
                  className="underline"
                >
                  Learn more
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
        <div>
          <Button
            text="Save changes"
            className="h-8"
            loading={isSubmitting}
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

function GroupSettingsFormSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="px-5 py-5">
        <div className="mb-4 h-6 w-20 animate-pulse rounded bg-neutral-200" />
        <div className="space-y-6 py-2">
          {/* Name field skeleton */}
          <div>
            <div className="mb-2 h-4 w-10 animate-pulse rounded bg-neutral-200" />
            <div className="relative">
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <div className="h-6 w-6 animate-pulse rounded-full bg-neutral-300" />
              </div>
            </div>
            <div className="mt-2 h-3 w-56 animate-pulse rounded bg-neutral-100" />
          </div>

          {/* Group slug field skeleton */}
          <div>
            <div className="mb-2 h-4 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="flex">
              <div className="h-10 w-48 animate-pulse rounded-l-md bg-neutral-200" />
              <div className="h-10 w-full animate-pulse rounded-r-md bg-neutral-200" />
            </div>
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-neutral-100" />
          </div>

          {/* Group ID field skeleton */}
          <div>
            <div className="mb-2 h-4 w-32 animate-pulse rounded bg-neutral-200" />
            <div className="flex">
              <div className="h-10 w-48 animate-pulse rounded-l-md bg-neutral-200" />
              <div className="h-10 w-full animate-pulse rounded-r-md bg-neutral-200" />
            </div>
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
        <div className="h-8 w-28 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}
