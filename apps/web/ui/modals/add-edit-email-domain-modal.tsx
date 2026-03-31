import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { createEmailDomainBodySchema } from "@/lib/zod/schemas/email-domains";
import { AlertCircleFill } from "@/ui/shared/icons";
import { AnimatedSizeContainer, Button, Modal } from "@dub/ui";
import { cn, getApexDomain } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import * as z from "zod/v4";

interface AddEditEmailDomainModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  emailDomain?: {
    id: string;
    slug: string;
  };
}

type FormData = z.input<typeof createEmailDomainBodySchema>;

function AddEditEmailDomainModalContent({
  setIsOpen,
  emailDomain,
}: AddEditEmailDomainModalProps) {
  const { makeRequest: createEmailDomain, isSubmitting: isCreating } =
    useApiMutation();
  const { makeRequest: updateEmailDomain, isSubmitting: isUpdating } =
    useApiMutation();

  const [isApexDomain, setIsApexDomain] = useState(false);
  const [apexDomain, setApexDomain] = useState<string>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      slug: emailDomain?.slug || "",
    },
  });

  const slug = watch("slug");

  const checkIfApexDomain = useDebouncedCallback((value: string) => {
    if (!value || value.trim() === "") {
      setIsApexDomain(false);
      setApexDomain("");
      return;
    }

    try {
      const normalizedValue = value.trim().toLowerCase();
      const detectedApexDomain = getApexDomain(`https://${normalizedValue}`);
      // If the apex domain equals the input (after removing www prefix), it's an apex domain
      const valueWithoutWww = normalizedValue.replace(/^www\./, "");
      const isApex =
        detectedApexDomain === normalizedValue ||
        detectedApexDomain === valueWithoutWww;
      setIsApexDomain(isApex);
      setApexDomain(isApex ? detectedApexDomain : "");
    } catch (e) {
      setIsApexDomain(false);
      setApexDomain("");
    }
  }, 300);

  useEffect(() => {
    checkIfApexDomain(slug || "");
  }, [slug, checkIfApexDomain]);

  const onSubmit = async (data: FormData) => {
    if (isApexDomain) {
      toast.error(
        "Please use a subdomain instead of an apex domain (e.g., mail.dub.co)",
      );
      return;
    }

    if (!emailDomain) {
      return await createEmailDomain("/api/email-domains", {
        method: "POST",
        body: data,
        onSuccess: async () => {
          toast.success("Email domain created successfully!");
          setIsOpen(false);
          await mutatePrefix("/api/email-domains");
        },
      });
    }

    return await updateEmailDomain(`/api/email-domains/${emailDomain.slug}`, {
      method: "PATCH",
      body: data,
      onSuccess: async () => {
        toast.success("Email domain updated successfully!");
        setIsOpen(false);
        await mutatePrefix("/api/email-domains");
      },
    });
  };

  const saveDisabled = useMemo(() => {
    return !slug || isApexDomain;
  }, [slug, isApexDomain]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">
            {emailDomain ? "Edit email domain" : "Add email domain"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50">
        <div className="space-y-6 p-6">
          <div>
            <label
              htmlFor="slug"
              className="text-sm font-medium text-neutral-800"
            >
              Domain
            </label>
            <div className="mt-1.5">
              <div
                className={cn(
                  "-m-1 rounded-[0.625rem] p-1",
                  isApexDomain && slug
                    ? "bg-blue-100 text-blue-800"
                    : "bg-transparent",
                )}
              >
                <div className="flex rounded-md border border-neutral-300 bg-white">
                  <input
                    type="text"
                    id="slug"
                    autoFocus
                    className={cn(
                      "block w-full rounded-md border-0 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm",
                      errors.slug &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                    )}
                    {...register("slug", {
                      required: "Domain is required",
                      validate: (value) => {
                        if (!value) {
                          return "Domain is required";
                        }

                        const domainRegex =
                          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

                        if (!domainRegex.test(value)) {
                          return "Please enter a valid domain";
                        }

                        return true;
                      },
                    })}
                    placeholder="mail.dub.co"
                  />
                </div>

                <AnimatedSizeContainer
                  height
                  transition={{ ease: "easeInOut", duration: 0.1 }}
                >
                  {isApexDomain && slug && apexDomain && (
                    <div className="flex items-center justify-between gap-4 p-2 text-sm">
                      <p>
                        <span className="rounded-md bg-blue-200 px-1 py-0.5 font-mono">
                          {slug}
                        </span>{" "}
                        is an apex domain. Please use a subdomain instead (e.g.,{" "}
                        <span className="rounded-md bg-blue-200 px-1 py-0.5 font-mono">
                          partners.{apexDomain}
                        </span>
                        ) to maintain domain reputation.{" "}
                        <a
                          href="https://dub.co/help/article/email-campaigns#email-domain-setup"
                          target="_blank"
                          className="cursor-help font-semibold underline decoration-dotted underline-offset-2"
                        >
                          Learn more
                        </a>
                        .
                      </p>
                      <AlertCircleFill className="size-5 shrink-0" />
                    </div>
                  )}
                </AnimatedSizeContainer>
              </div>
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.slug.message}
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-500">
                This domain will be used to send campaign emails. You can
                configure specific "from" addresses when creating campaigns.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
        <div className="flex items-center justify-end gap-2 p-5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            text="Cancel"
            className="h-9 w-fit"
            disabled={isCreating || isUpdating}
          />

          <Button
            type="submit"
            variant="primary"
            text={emailDomain ? "Update domain" : "Add domain"}
            className="h-9 w-fit"
            loading={isCreating || isUpdating}
            disabled={saveDisabled}
          />
        </div>
      </div>
    </form>
  );
}

export function AddEditEmailDomainModal({
  isOpen,
  setIsOpen,
  emailDomain,
}: AddEditEmailDomainModalProps & {
  isOpen: boolean;
}) {
  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen}>
      <AddEditEmailDomainModalContent
        setIsOpen={setIsOpen}
        emailDomain={emailDomain}
      />
    </Modal>
  );
}

export function useAddEditEmailDomainModal(
  props: Omit<AddEditEmailDomainModalProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    addEditEmailDomainModal: (
      <AddEditEmailDomainModal
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        {...props}
      />
    ),
    setIsOpen,
  };
}
