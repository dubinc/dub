"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { InvitePartners } from "@/lib/zod/schemas/program-onboarding";
import { Button, Input } from "@dub/ui";
import { cn } from "@dub/utils";
import { Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [keyErrors, setKeyErrors] = useState<{ [key: number]: string }>({});

  const [focusedField, setFocusedField] = useState<{
    index: number;
    field: "email" | "key";
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<InvitePartners>({
    defaultValues: {
      partners: [{ email: "", key: "" }],
    },
  });

  const [programOnboarding, _, { mutateWorkspace }] = useWorkspaceStore<{
    rewardfulAffiliateCount: number;
    domain: string;
  }>("programOnboarding");

  const { fields, append, remove } = useFieldArray({
    name: "partners",
    control,
  });

  const partners = watch("partners");
  const [debouncedPartners] = useDebounce(partners, 500);

  const domain = programOnboarding?.domain;

  console.log(programOnboarding);

  const generateKeyFromEmail = (email: string) => {
    if (!email) {
      return "";
    }

    const prefix = email.split("@")[0];
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit number

    return `${prefix}${randomNum}`;
  };

  const validateKey = async (key: string, index: number) => {
    if (!key) {
      setKeyErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });

      return;
    }

    if (!domain) {
      return;
    }

    const response = await fetch(
      `/api/links/exists?domain=${domain}&key=${key}&workspaceId=${workspaceId}`,
    );

    const { error } = await response.json();

    setKeyErrors((prev) => {
      const newErrors = { ...prev };

      if (error) {
        newErrors[index] = error.message;
      } else {
        delete newErrors[index];
      }

      return newErrors;
    });
  };

  useEffect(() => {
    if (!debouncedPartners) {
      return;
    }

    debouncedPartners.forEach((partner, index) => {
      if (partner.key) {
        validateKey(partner.key, index);
      }
    });
  }, [debouncedPartners]);

  useEffect(() => {
    if (!focusedField || !partners) {
      return;
    }

    const { index, field } = focusedField;

    if (field === "key") {
      const partner = partners[index];
      if (partner?.email && !partner.key) {
        setValue(`partners.${index}.key`, generateKeyFromEmail(partner.email));
      }
    }
  }, [focusedField]);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      mutateWorkspace();
      router.push(`/${workspaceSlug}/programs/onboarding/connect`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: InvitePartners) => {
    if (!workspaceId) {
      return;
    }

    await executeAsync({
      ...data,
      workspaceId,
      step: "invite-partners",
    });
  };

  return (
    <div className="space-y-6">
      {programOnboarding?.rewardfulAffiliateCount && (
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
              {programOnboarding.rewardfulAffiliateCount}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-800">
                  {index === 0 && "Email"}
                </label>
                <Input
                  {...register(`partners.${index}.email`)}
                  type="email"
                  placeholder="panic@thedis.co"
                  className="mt-2"
                  onFocus={() => setFocusedField({ index, field: "email" })}
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-800">
                  {index === 0 && "Referral link"}
                </label>
                <div className="flex items-center gap-2">
                  <div className="mt-2 w-full">
                    <div
                      className={cn(
                        "flex items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                        keyErrors[index] &&
                          "border-red-300 focus-within:border-red-500 focus-within:ring-red-500",
                      )}
                    >
                      <div className="flex items-center border-r border-neutral-300 bg-neutral-100 px-3">
                        <span className="text-sm font-medium text-neutral-800">
                          {domain}
                        </span>
                      </div>
                      <input
                        {...register(`partners.${index}.key`)}
                        type="text"
                        placeholder="panic"
                        className={cn(
                          "w-full border-0 bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0",
                          keyErrors[index] &&
                            "text-red-900 placeholder-red-300",
                        )}
                        onFocus={() => setFocusedField({ index, field: "key" })}
                      />
                    </div>
                    {keyErrors[index] && (
                      <p className="mt-2 text-sm text-red-600">
                        {keyErrors[index]}
                      </p>
                    )}
                  </div>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      icon={<Trash2 className="size-4" />}
                      className="mt-2 h-10 w-10 shrink-0 p-0"
                      onClick={() => remove(index)}
                    />
                  )}
                </div>
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
