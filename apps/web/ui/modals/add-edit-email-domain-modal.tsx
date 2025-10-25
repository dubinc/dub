import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useProgram from "@/lib/swr/use-program";
import { createEmailDomainBodySchema } from "@/lib/zod/schemas/email-domains";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface AddEditEmailDomainModalProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  emailDomain?: {
    id: string;
    slug: string;
    fromAddress: string;
  };
}

type FormData = z.input<typeof createEmailDomainBodySchema>;

function AddEditEmailDomainModalContent({
  setIsOpen,
  emailDomain,
}: AddEditEmailDomainModalProps) {
  const { program } = useProgram();
  const { makeRequest: createEmailDomain, isSubmitting: isCreating } =
    useApiMutation();
  const { makeRequest: updateEmailDomain, isSubmitting: isUpdating } =
    useApiMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      slug: emailDomain?.slug || "",
      fromAddress: emailDomain?.fromAddress
        ? emailDomain.fromAddress.split("@")[0]
        : "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const requestData = {
      ...data,
      fromAddress: `${data.fromAddress}@${data.slug}`,
    };

    if (!emailDomain) {
      return await createEmailDomain("/api/email-domains", {
        method: "POST",
        body: requestData,
        onSuccess: async () => {
          toast.success("Email domain created successfully!");
          setIsOpen(false);
          await mutatePrefix("/api/email-domains");
        },
      });
    }

    return await updateEmailDomain(`/api/email-domains/${emailDomain.slug}`, {
      method: "PATCH",
      body: requestData,
      onSuccess: async () => {
        toast.success("Email domain updated successfully!");
        setIsOpen(false);
        await mutatePrefix("/api/email-domains");
      },
    });
  };

  const [slug, fromAddress] = watch(["slug", "fromAddress"]);

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
              Domain or subdomain
            </label>
            <div className="mt-1.5">
              <input
                type="text"
                id="slug"
                autoFocus
                className={cn(
                  "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
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
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.slug.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="fromAddress"
              className="text-sm font-medium text-neutral-800"
            >
              From address
            </label>
            <div className="mt-1.5">
              <div className="relative">
                <input
                  type="text"
                  id="fromAddress"
                  className={cn(
                    "block w-full rounded-md border border-neutral-300 px-3 py-2 pr-20 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.fromAddress &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("fromAddress", {
                    required: "From address is required",
                    validate: (value) => {
                      if (!value) return "From address is required";

                      // Check if the local part is valid (no @ symbols, spaces, etc.)
                      const localPartRegex = /^[a-zA-Z0-9._-]+$/;
                      if (!localPartRegex.test(value)) {
                        return "From address can only contain letters, numbers, dots, underscores, and hyphens";
                      }

                      // Check if it's a valid email format when combined with domain
                      const domain = watch("slug");
                      if (!domain) {
                        return "Please enter a domain first";
                      }

                      const fullEmail = `${value}@${domain}`;
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(fullEmail)) {
                        return "Please enter a valid email address";
                      }

                      return true;
                    },
                  })}
                  placeholder="partners"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-neutral-500">
                    @{watch("slug") || "dub.co"}
                  </span>
                </div>
              </div>
              {errors.fromAddress && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.fromAddress.message}
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-500">
                Used to send campaigns and bounty emails. Replies will go to{" "}
                {program?.supportEmail}
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
            disabled={!slug || !fromAddress}
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

