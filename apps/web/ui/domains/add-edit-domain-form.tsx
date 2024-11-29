import { isValidDomain } from "@/lib/api/domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { AlertCircleFill, CheckCircleFill, Lock } from "@/ui/shared/icons";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  AnimatedSizeContainer,
  Badge,
  Button,
  InfoTooltip,
  LoadingSpinner,
  SimpleTooltipContent,
  Switch,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import {
  Binoculars,
  Crown,
  Milestone,
  QrCode,
  TextCursorInput,
} from "lucide-react";
import posthog from "posthog-js";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";

const domainFormSchema = z.object({
  slug: z.string().min(1, "Domain is required"),
  logo: z.string().optional(),
  expiredUrl: z.string().url().optional().or(z.literal("")),
  notFoundUrl: z.string().url().optional().or(z.literal("")),
  placeholder: z.string().url().optional().or(z.literal("")),
});

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

export function AddEditDomainForm({
  props,
  onSuccess,
  showAdvancedOptions = true,
  className,
}: {
  props?: DomainProps;
  onSuccess?: (data: DomainProps) => void;
  showAdvancedOptions?: boolean;
  className?: string;
}) {
  const { id: workspaceId, plan } = useWorkspace();
  const isDubProvisioned = !!props?.registeredDomain;
  const [lockDomain, setLockDomain] = useState(true);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>(
    props ? "available" : "idle",
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<z.infer<typeof domainFormSchema>>({
    defaultValues: {
      slug: props?.slug || "",
      logo: props?.logo || "",
      expiredUrl: props?.expiredUrl || "",
      notFoundUrl: props?.notFoundUrl || "",
      placeholder: props?.placeholder || "",
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

  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PATCH",
        url: `/api/domains/${domain}?workspaceId=${workspaceId}`,
        successMessage: "Successfully updated domain!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/domains?workspaceId=${workspaceId}`,
        successMessage: "Successfully added domain!",
      };
    }
  }, [props, workspaceId]);

  const { isMobile } = useMediaQuery();

  const onSubmit = async (formData: z.infer<typeof domainFormSchema>) => {
    try {
      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await Promise.all([
          mutate(
            (key) => typeof key === "string" && key.startsWith("/api/domains"),
          ),
          mutate(
            (key) => typeof key === "string" && key.startsWith("/api/links"),
            undefined,
            { revalidate: true },
          ),
        ]);
        const data = await res.json();
        posthog.capture(props ? "domain_updated" : "domain_created", data);
        toast.success(endpoint.successMessage);
        onSuccess?.(data);
      } else {
        const { error } = await res.json();
        if (res.status === 422) {
          setDomainStatus("conflict");
        }
        if (error.message.includes("Upgrade to Pro")) {
          toast.custom(() => (
            <UpgradeRequiredToast
              title="You've discovered a Pro feature!"
              message={error.message}
            />
          ));
        } else {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error(`Failed to ${props ? "update" : "add"} domain`);
    }
  };

  const currentStatusProps = STATUS_CONFIG[domainStatus];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-y-6 text-left", className)}
    >
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="domain" className="flex items-center gap-x-2">
            <h2 className="text-sm font-medium text-neutral-700">
              Your domain
            </h2>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Not sure which domain to use?"
                  cta="Check out our guide"
                  href="https://dub.co/help/article/choosing-a-custom-domain"
                />
              }
            />
          </label>
          {props && lockDomain && !isDubProvisioned && (
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

      {showAdvancedOptions && (
        <>
          <div className="h-0.5 w-full bg-neutral-200" />
          <div className="flex flex-col gap-y-6">
            {ADVANCED_OPTIONS.map(
              ({ id, title, description, icon: Icon, proFeature }) => {
                const [showOption, setShowOption] = useState(
                  !!watch(id as keyof z.infer<typeof domainFormSchema>),
                );
                return (
                  <div key={id}>
                    <label className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="hidden rounded-lg border border-neutral-200 bg-white p-2 sm:block">
                          <Icon className="size-5 text-neutral-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-medium text-neutral-900">
                              {title}
                            </h2>
                            {proFeature && plan === "free" && (
                              <Badge className="flex items-center space-x-1 bg-white">
                                <Crown size={12} />
                                <p className="uppercase">Pro</p>
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500">
                            {description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={showOption}
                        fn={(checked) => {
                          setShowOption(checked);
                          if (!checked) {
                            setValue(
                              id as keyof z.infer<typeof domainFormSchema>,
                              "",
                              {
                                shouldDirty: true,
                              },
                            );
                          }
                        }}
                      />
                    </label>
                    <motion.div
                      animate={{ height: showOption ? "auto" : 0 }}
                      transition={{ duration: 0.1 }}
                      initial={false}
                      className="-m-1 overflow-hidden p-1"
                    >
                      <div className="relative mt-2 rounded-md shadow-sm">
                        <input
                          {...register(
                            id as keyof z.infer<typeof domainFormSchema>,
                          )}
                          className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </motion.div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}

      <Button
        text={props ? "Save changes" : "Add domain"}
        disabled={saveDisabled}
        loading={isSubmitting}
      />
    </form>
  );
}

const ADVANCED_OPTIONS = [
  {
    id: "logo",
    title: "Custom QR code logo",
    description: "Which logo to use for shortlink QR codes",
    icon: QrCode,
    proFeature: true,
  },
  {
    id: "expiredUrl",
    title: "Default expiration URL",
    description: "Where to redirect when shortlinks expire",
    icon: Milestone,
  },
  {
    id: "notFoundUrl",
    title: "Not found URL",
    description: "Where to redirect when shortlinks don't exist",
    icon: Binoculars,
  },
  {
    id: "placeholder",
    title: "Input placeholder URL",
    description: "Which placeholder URL to show in the link builder",
    icon: TextCursorInput,
  },
];
