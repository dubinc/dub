"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { ProgramData } from "@/lib/zod/schemas/program-onboarding";
import { AlertCircleFill } from "@/ui/shared/icons";
import { Button, Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

const generateKeyFromEmail = (email: string) => {
  if (!email) return "";

  const prefix = email.split("@")[0];
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${randomNum}`;
};

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [keyErrors, setKeyErrors] = useState<{ [key: number]: string }>({});
  const [_, __, { mutateWorkspace }] = useWorkspaceStore("programOnboarding");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useFormContext<ProgramData>();

  const { fields, append, remove } = useFieldArray({
    name: "partners",
    control,
  });

  const [rewardful, domain, partners] = watch([
    "rewardful",
    "domain",
    "partners",
  ]);

  const [debouncedPartners] = useDebounce(partners, 500);

  const handleKeyFocus = (index: number) => {
    const email = watch(`partners.${index}.email`);
    const currentKey = watch(`partners.${index}.key`);

    if (email && !currentKey) {
      setValue(`partners.${index}.key`, generateKeyFromEmail(email));
    }
  };

  const runKeyChecks = async (index: number, value: string) => {
    if (!value || !domain || !workspaceId) return;

    try {
      const res = await fetch(
        `/api/links/exists?domain=${domain}&key=${value}&workspaceId=${workspaceId}`,
      );

      const { error } = await res.json();

      if (error) {
        setKeyErrors((prev) => ({
          ...prev,
          [index]: error.message.replace("Duplicate key: ", ""),
        }));
      } else {
        setKeyErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleKeyChange = (index: number, key: string) => {
    setKeyErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  useEffect(() => {
    if (!debouncedPartners) return;

    debouncedPartners.forEach((partner, index) => {
      if (partner.key) {
        runKeyChecks(index, partner.key);
      }
    });
  }, [debouncedPartners, domain, workspaceId]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      mutateWorkspace();
      router.push(`/${workspaceSlug}/programs/new/connect`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: ProgramData) => {
    if (!workspaceId) return;

    data.partners =
      data?.partners?.filter(
        (partner) => partner.email !== "" && partner.key !== "",
      ) ?? null;

    if (data.partners && data.partners.length > 0) {
      await Promise.all(
        data.partners.map((partner, index) => runKeyChecks(index, partner.key)),
      );

      if (Object.keys(keyErrors).length > 0) {
        toast.error("Please check the referral link for each partner.");
        return;
      }
    }

    await executeAsync({
      ...data,
      workspaceId,
      step: "invite-partners",
    });
  };

  return (
    <div className="space-y-6">
      {rewardful?.affiliates && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Invite new partners in addition to those being imported.
          </p>

          <div className="mt-10 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-full bg-blue-600">
                <img
                  src="https://assets.dub.co/misc/icons/rewardful.svg"
                  alt="Rewardful logo"
                  className="size-5"
                />
              </div>
              <span className="text-sm font-medium text-neutral-800">
                Affiliates importing
              </span>
            </div>
            <span className="text-sm text-neutral-600">
              {rewardful?.affiliates}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-medium text-neutral-800">
            Email
          </label>

          <label className="block text-sm font-medium text-neutral-800">
            Referral link
          </label>
        </div>

        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="h-16 w-full sm:w-1/2">
                <Input
                  {...register(`partners.${index}.email`)}
                  type="email"
                  placeholder="panic@thedis.co"
                  className="mt-2"
                />
              </div>

              <div className="h-16 w-full sm:w-1/2">
                <div className="flex items-center gap-1">
                  <div className="relative mt-2 w-full">
                    <div
                      className={cn(
                        "relative flex items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                        keyErrors[index] &&
                          "border-red-500 focus-within:border-red-500 focus-within:ring-red-500",
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center border-r border-neutral-300 bg-neutral-100 px-3",
                          keyErrors[index] && "border-red-500",
                        )}
                      >
                        <span className="text-sm font-medium text-neutral-800">
                          {domain}
                        </span>
                      </div>
                      <input
                        {...register(`partners.${index}.key`)}
                        type="text"
                        placeholder="panic"
                        onFocus={() => handleKeyFocus(index)}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        className={cn(
                          "w-full border-0 bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0",
                          keyErrors[index] &&
                            "pr-10 text-red-700 placeholder-red-300",
                        )}
                      />

                      {keyErrors[index] && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <AlertCircleFill className="h-5 w-5 text-red-700" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex w-8">
                    {index > 0 && (
                      <Button
                        variant="outline"
                        icon={<Trash2 className="size-4" />}
                        className="size-8 w-full p-0"
                        onClick={() => remove(index)}
                      />
                    )}
                  </div>
                </div>

                <p className="py-1 text-xs text-red-700">
                  {keyErrors[index] && keyErrors[index]}
                </p>
              </div>
            </div>
          ))}

          <Button
            text="Add partner"
            variant="secondary"
            icon={<Plus className="size-4" />}
            className="w-fit"
            onClick={() => {
              if (fields.length < 10) {
                append({ email: "", key: "" });
              }
            }}
            disabled={fields.length >= 10}
          />

          {fields.length >= 10 && (
            <p className="text-sm text-neutral-600">
              You can add up to 10 partners at a time
            </p>
          )}
        </div>

        <Button
          text="Continue"
          className="w-full"
          loading={isSubmitting || isPending}
          disabled={isSubmitting || isPending}
        />
      </form>
    </div>
  );
}
