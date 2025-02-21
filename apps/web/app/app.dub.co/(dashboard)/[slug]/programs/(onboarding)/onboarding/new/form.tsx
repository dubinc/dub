"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import {
  ProgramData,
  programInfoSchema,
} from "@/lib/zod/schemas/program-onboarding";
import { Badge, Button, CircleCheckFill, Input, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export const LINK_TYPES = [
  {
    value: "short",
    label: "Short link",
    preview: "refer.dub.co/steven",
    disabled: false,
  },
  {
    value: "query",
    label: "Query parameter",
    preview: "dub.co/?via=steven",
    disabled: false,
  },
  {
    value: "dynamic",
    label: "Dynamic path",
    preview: "dub.co/refer/steven",
    disabled: true,
    badge: "Coming soon",
  },
];

type Form = z.infer<typeof programInfoSchema>;

export function Form() {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { activeWorkspaceDomains, loading } = useDomains();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const [programOnboarding, _, { mutateWorkspace }] =
    useWorkspaceStore<ProgramData>("programOnboarding");

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<Form>({
    defaultValues: {
      linkType: "short",
      domain: programOnboarding?.domain,
      url: programOnboarding?.url,
      name: programOnboarding?.name,
      logo: programOnboarding?.logo,
    },
  });

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      mutateWorkspace();
      router.push(`/${workspaceSlug}/programs/onboarding/rewards`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: Form) => {
    if (!workspaceId) {
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
      step: "fill-basic-info",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div>
        <label className="block text-sm font-medium text-neutral-800">
          Program name
        </label>
        <Input
          {...register("name", { required: true })}
          placeholder="Acme Partner Program"
          autoFocus={!isMobile}
          className={"mt-2 max-w-full"}
        />
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
          <h2 className="text-base font-medium text-neutral-900">
            Link structure
          </h2>
          <p className="text-sm font-normal text-neutral-600">
            Set how the link shows up in the partner portal
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {LINK_TYPES.map((type) => {
            const isSelected = watch("linkType") === type.value;

            return (
              <label
                key={type.value}
                className={cn(
                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                  "transition-all duration-150",
                  isSelected &&
                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                  type.disabled && "cursor-not-allowed hover:bg-white",
                )}
              >
                <input
                  type="radio"
                  {...register("linkType")}
                  value={type.value}
                  className="hidden"
                  disabled={type.disabled}
                />

                <div className="flex grow flex-col text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">
                      {type.label}
                    </span>
                    {type.badge && (
                      <Badge variant="blueGradient" size="sm">
                        {type.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-normal text-neutral-900">
                    {type.preview}
                  </span>
                </div>

                {!type.disabled && (
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
        loading={isSubmitting || isPending}
        disabled={isSubmitting || isPending}
      />
    </form>
  );
}
