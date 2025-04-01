import { isValidDomain } from "@/lib/api/domains";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { createOrUpdateEmailDomainSchema } from "@/lib/zod/schemas/email-domain";
import { AlertCircleFill, CheckCircleFill, Lock } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  LoadingSpinner,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";

type FormData = z.infer<typeof createOrUpdateEmailDomainSchema>;

type DomainStatus = "checking" | "conflict" | "has site" | "available" | "idle";

const STATUS_CONFIG: Record<
  DomainStatus,
  {
    prefix?: string;
    useStrong?: boolean;
    suffix?: string;
    icon?: React.ElementType;
    className?: string;
    message?: string;
  }
> = {
  checking: {
    prefix: "Checking availability for",
    useStrong: true,
    suffix: "...",
    icon: LoadingSpinner,
  },
  conflict: {
    suffix: "is already in use.",
    icon: AlertCircleFill,
    className: "bg-red-100 text-red-600",
  },
  "has site": {
    suffix:
      "already has a site connected. Ensure you want to connect this domain for shortlinks.",
    icon: AlertCircleFill,
    className: "bg-amber-100 text-amber-600",
  },
  available: {
    suffix: "is ready to connect.",
    icon: CheckCircleFill,
    className: "bg-green-100 text-green-600",
  },
  idle: {
    message: "Enter a valid domain to check availability.",
  },
};

export function AddEditEmailDomainForm({
  props,
  onSuccess,
  className,
}: {
  props?: EmailDomainProps;
  onSuccess?: (data: EmailDomainProps) => void;
  className?: string;
}) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId } = useWorkspace();
  const [lockDomain, setLockDomain] = useState(true);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>(
    props ? "available" : "idle",
  );

  const {
    watch,
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      slug: props?.slug,
    },
  });

  const domain = watch("slug");

  const debouncedValidateDomain = useDebouncedCallback(
    async (value: string) => {
      if (!isValidDomain(value)) return;
      setDomainStatus("checking");
      fetch(`/api/domains/${value}/validate`).then(async (res) => {
        const data = await res.json();
        setDomainStatus(data.status);
      });
    },
    500,
  );

  const saveDisabled = useMemo(() => {
    return (
      !["available", "has site"].includes(domainStatus) || (props && !isDirty)
    );
  }, [isSubmitting, domainStatus, props, isDirty]);

  const currentStatusProps = STATUS_CONFIG[domainStatus];

  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PATCH",
        url: `/api/email-domains/${domain}?workspaceId=${workspaceId}`,
        successMessage: "Successfully updated email domain!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/email-domains?workspaceId=${workspaceId}`,
        successMessage: "Successfully added email domain!",
      };
    }
  }, [props, workspaceId]);

  const onSubmit = async (formData: FormData) => {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await mutatePrefix("/api/email-domains");
        const data = await response.json();
        toast.success(endpoint.successMessage);
        onSuccess?.(data);
      } else {
        const { error } = await response.json();
        toast.error(error.message);

        if (response.status === 422) {
          setDomainStatus("conflict");
        }
      }
    } catch (error) {
      toast.error(`Failed to ${props ? "update" : "add"} email domain.`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-y-6 text-left", className)}
    >
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="domain" className="flex items-center gap-x-2">
            <h2 className="text-sm font-medium text-neutral-700">
              Email domain
            </h2>
          </label>

          {props && lockDomain && (
            <button
              className="flex items-center gap-x-2 text-sm text-neutral-500 transition-all duration-75 hover:text-black active:scale-95"
              type="button"
              onClick={() => {
                window.confirm(
                  "Warning: Changing your workspace's domain will break all existing short links. Are you sure you want to continue?",
                ) && setLockDomain(false);
              }}
            >
              <Lock className="h-3 w-3" />
              <p>Unlock</p>
            </button>
          )}
        </div>

        {props && lockDomain ? (
          <div className="mt-2 cursor-not-allowed rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 shadow-sm">
            {domain}
          </div>
        ) : (
          <div className="mt-2">
            <div
              className={cn(
                "-m-1 rounded-[0.625rem] p-1",
                currentStatusProps.className ||
                  "bg-neutral-200 text-neutral-500",
              )}
            >
              <div className="flex rounded-md border border-neutral-300 bg-white">
                <input
                  {...register("slug", {
                    onChange: (e) => {
                      setDomainStatus("idle");
                      debouncedValidateDomain(e.target.value);
                    },
                  })}
                  className="block w-full rounded-md border-0 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  placeholder="go.acme.com"
                  autoFocus={!isMobile}
                />
              </div>

              <AnimatedSizeContainer
                height
                transition={{ ease: "easeInOut", duration: 0.1 }}
              >
                <div className="flex items-center justify-between gap-4 p-2 text-sm">
                  <p>
                    {domainStatus !== "idle" ? (
                      <>
                        {currentStatusProps.prefix || "The domain"}{" "}
                        {currentStatusProps.useStrong ? (
                          <strong className="font-semibold underline underline-offset-2">
                            {domain}
                          </strong>
                        ) : (
                          <span className="font-semibold underline underline-offset-2">
                            {domain}
                          </span>
                        )}{" "}
                        {currentStatusProps.suffix}
                      </>
                    ) : (
                      currentStatusProps.message
                    )}
                  </p>
                  {currentStatusProps.icon && (
                    <currentStatusProps.icon className="size-5 shrink-0" />
                  )}
                </div>
              </AnimatedSizeContainer>
            </div>
          </div>
        )}
      </div>

      <Button
        text={props ? "Save changes" : "Add domain"}
        disabled={saveDisabled}
        loading={isSubmitting}
      />
    </form>
  );
}
