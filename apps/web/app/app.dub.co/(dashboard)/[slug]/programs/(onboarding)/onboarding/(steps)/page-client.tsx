"use client";

import useDomains from "@/lib/swr/use-domains";
import { Button, Input, Switch, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const gettingStartedSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  logo: z.string().min(1, "Logo is required"),
  defaultDomain: z.string().min(1, "Default domain is required"),
  destinationUrl: z
    .string()
    .url("Invalid URL")
    .min(1, "Destination URL is required"),
  allowCustomLinks: z.boolean().default(false),
});

type GettingStartedFormData = z.infer<typeof gettingStartedSchema>;

export function GettingStarted() {
  const { isMobile } = useMediaQuery();

  const { activeWorkspaceDomains, loading, error } = useDomains();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GettingStartedFormData>({
    resolver: zodResolver(gettingStartedSchema),
  });

  const onSubmit = async (data: GettingStartedFormData) => {
    console.log(data);
    // TODO: Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Program name
        </label>
        <Input
          {...register("name")}
          placeholder="Acme Partner Program"
          autoFocus={!isMobile}
          className={cn(
            "mt-2 max-w-full",
            errors.name &&
              "border-red-500 focus:border-red-500 focus:ring-red-500",
          )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* <div>
        <label className="block text-sm font-medium text-neutral-800">
          Logo
          <span className="ml-1 text-sm font-normal text-neutral-500">
            (A square logo that will be used in various parts of your program)
          </span>
        </label>
        <Input
          {...register("logo")}
          placeholder="Upload logo"
          className={cn(
            "mt-2",
            errors.logo &&
              "border-red-500 focus:border-red-500 focus:ring-red-500",
          )}
        />
        {errors.logo && (
          <p className="mt-1 text-sm text-red-500">{errors.logo.message}</p>
        )}
      </div> */}

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-base font-medium text-neutral-900">
            Referral Link
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
            <div className="flex items-center justify-center">
              <span className="text-sm text-neutral-500">Loading...</span>
            </div>
          ) : (
            <select className="mt-2 block w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500">
              {activeWorkspaceDomains?.map(({ slug }) => (
                <option value={slug} key={slug}>
                  {slug}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-800">
            Allow partners to create additional links
          </label>
          <Switch {...register("allowCustomLinks")} />
        </div>
      </div>

      <Button text="Continue" loading={isSubmitting} className="w-full" />
    </form>
  );
}
