"use client";

import { AlertCircleFill } from "@/ui/shared/icons";
import { Button, InfoTooltip, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { trackEvent } from "fathom-client";
import { usePlausible } from "next-plausible";
import posthog from "posthog-js";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";

type FormData = {
  name: string;
  slug: string;
};

export function CreateWorkspaceForm({
  onSuccess,
  className,
}: {
  onSuccess?: (data: FormData) => void;
  className?: string;
}) {
  const plausible = usePlausible();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting, isSubmitSuccessful, errors },
  } = useForm<FormData>();

  const slug = watch("slug");

  const { isMobile } = useMediaQuery();

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (res.ok) {
            const { id: workspaceId } = await res.json();
            trackEvent("Created Workspace");
            plausible("Created Workspace");
            // track workspace creation event
            posthog.capture("workspace_created", {
              workspace_id: workspaceId,
              workspace_name: data.name,
              workspace_slug: data.slug,
            });
            await mutate("/api/workspaces");
            onSuccess?.(data);
          } else {
            const { error } = await res.json();
            const message = error.message;

            if (message.toLowerCase().includes("slug")) {
              return setError("slug", { message });
            }

            toast.error(error.message);
            setError("root.serverError", { message: error.message });
          }
        } catch (e) {
          toast.error("Failed to create workspace.");
          console.error("Failed to create workspace", e);
          setError("root.serverError", {
            message: "Failed to create workspace",
          });
        }
      })}
      className={cn("flex flex-col space-y-6 text-left", className)}
    >
      <div>
        <label htmlFor="name" className="flex items-center space-x-2">
          <p className="block text-sm font-medium text-gray-700">
            Workspace Name
          </p>
          <InfoTooltip
            content={`This is the name of your workspace on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
          />
        </label>
        <div className="mt-2 flex rounded-md shadow-sm">
          <input
            id="name"
            type="text"
            autoFocus={!isMobile}
            autoComplete="off"
            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            placeholder="Acme, Inc."
            {...register("name", {
              required: true,
              onChange: (e) => setValue("slug", slugify(e.target.value)),
            })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="slug" className="flex items-center space-x-2">
          <p className="block text-sm font-medium text-gray-700">
            Workspace Slug
          </p>
          <InfoTooltip
            content={`This is your workspace's unique slug on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
          />
        </label>
        <div className="relative mt-2 flex rounded-md shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-gray-500 sm:text-sm">
            app.{process.env.NEXT_PUBLIC_APP_DOMAIN}
          </span>
          <input
            id="slug"
            type="text"
            required
            autoComplete="off"
            className={`${
              errors.slug
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
            } block w-full rounded-r-md focus:outline-none sm:text-sm`}
            placeholder="acme"
            {...register("slug", {
              required: true,
              minLength: 3,
              maxLength: 48,
              pattern: /^[a-zA-Z0-9\-]+$/,
            })}
            onBlur={() => {
              fetch(`/api/workspaces/${slug}/exists`).then(async (res) => {
                if (res.status === 200) {
                  const exists = await res.json();
                  if (exists === 1)
                    setError("slug", {
                      message: `The slug "${slug}" is already in use.`,
                    });
                  else clearErrors("slug");
                }
              });
            }}
            aria-invalid="true"
          />
          {errors.slug && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {errors.slug && (
          <p className="mt-2 text-sm text-red-600" id="slug-error">
            {errors.slug.message}
          </p>
        )}
      </div>

      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text="Create workspace"
      />
    </form>
  );
}
