import { isValidDomain } from "@/lib/api/domains";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { createDomainBodySchema } from "@/lib/zod/schemas/domains";
import { AlertCircleFill, CheckCircleFill, Lock } from "@/ui/shared/icons";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  AndroidLogo,
  AnimatedSizeContainer,
  AppleLogo,
  Badge,
  Button,
  FileUpload,
  InfoTooltip,
  LoadingSpinner,
  ShimmerDots,
  SimpleTooltipContent,
  Switch,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import {
  Binoculars,
  ChevronDown,
  Crown,
  Milestone,
  QrCode,
  TextCursorInput,
} from "lucide-react";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { QRCode } from "../shared/qr-code";

const sanitizeJson = (string: string | null) => {
  if (!string) {
    return null;
  }

  try {
    return JSON.stringify(JSON.parse(string));
  } catch (e) {
    return string;
  }
};

const formatJson = (string: string) => {
  try {
    return JSON.stringify(JSON.parse(string), null, 2);
  } catch (e) {
    return string;
  }
};

type FormData = z.infer<typeof createDomainBodySchema>;

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
  enableDomainConfig = true,
  className,
}: {
  props?: DomainProps;
  onSuccess?: (data: DomainProps) => void;
  enableDomainConfig?: boolean;
  className?: string;
}) {
  const { id: workspaceId, plan } = useWorkspace();
  const [lockDomain, setLockDomain] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>(
    props ? "available" : "idle",
  );
  const [showOptionStates, setShowOptionStates] = useState<
    Record<string, boolean>
  >({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      slug: props?.slug,
      logo: props?.logo,
      expiredUrl: props?.expiredUrl,
      notFoundUrl: props?.notFoundUrl,
      placeholder: props?.placeholder,
      appleAppSiteAssociation: props?.appleAppSiteAssociation
        ? formatJson(props.appleAppSiteAssociation)
        : undefined,
      assetLinks: props?.assetLinks ? formatJson(props.assetLinks) : undefined,
    },
  });

  useEffect(() => {
    if (props?.appleAppSiteAssociation || props?.assetLinks) {
      setShowAdvancedOptions(true);
      setShowOptionStates((prev) => ({
        ...prev,
        appleAppSiteAssociation: !!props?.appleAppSiteAssociation?.trim(),
        assetLinks: !!props?.assetLinks?.trim(),
      }));
    }
  }, [props]);

  useEffect(() => {
    setShowOptionStates((prev) => ({
      ...prev,
      appleAppSiteAssociation: false,
      assetLinks: false,
      logo: false,
      expiredUrl: false,
      notFoundUrl: false,
      placeholder: false,
      ...prev,
    }));
  }, []);

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

  const isDubProvisioned = !!props?.registeredDomain;

  const onSubmit = async (formData: FormData) => {
    try {
      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ...(formData.logo === props?.logo && { logo: undefined }),
          ...(formData.assetLinks && {
            assetLinks: sanitizeJson(formData.assetLinks),
          }),
          ...(formData.appleAppSiteAssociation && {
            appleAppSiteAssociation: sanitizeJson(
              formData.appleAppSiteAssociation,
            ),
          }),
        }),
      });

      if (res.ok) {
        await Promise.all([
          mutatePrefix("/api/domains"),
          mutatePrefix("/api/links"),
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

      {enableDomainConfig && (
        <>
          <div className="h-0.5 w-full bg-neutral-200" />
          <div className="flex flex-col gap-y-6">
            {DOMAIN_OPTIONS.map(
              ({ id, title, description, icon: Icon, proFeature }) => {
                const showOption = showOptionStates[id] || !!watch(id);

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
                          setShowOptionStates((prev) => ({
                            ...prev,
                            [id]: checked,
                          }));
                          if (!checked) {
                            setValue(id, "", {
                              shouldDirty: true,
                            });
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </label>
                    <motion.div
                      animate={{ height: showOption ? "auto" : 0 }}
                      transition={{ duration: 0.1 }}
                      initial={false}
                      className="-m-1 overflow-hidden p-1"
                    >
                      <div className="relative mt-2 rounded-md shadow-sm">
                        {id === "logo" ? (
                          <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-neutral-300">
                            {!isMobile && (
                              <ShimmerDots className="pointer-events-none z-10 opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
                            )}
                            <Controller
                              control={control}
                              name="logo"
                              render={({ field }) => (
                                <FileUpload
                                  accept="images"
                                  className="h-24 rounded-md"
                                  iconClassName="size-5 text-neutral-700"
                                  variant="plain"
                                  imageSrc={field.value}
                                  readFile
                                  onChange={({ src }) => field.onChange(src)}
                                  maxFileSizeMB={2}
                                  targetResolution={{
                                    width: 160,
                                    height: 160,
                                  }}
                                  customPreview={
                                    <QRCode
                                      url="https://dub.co"
                                      fgColor="#000"
                                      logo={field.value || ""}
                                      scale={0.6}
                                    />
                                  }
                                />
                              )}
                            />
                          </div>
                        ) : (
                          <input
                            {...register(id)}
                            className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                            placeholder="https://yourwebsite.com"
                          />
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              },
            )}
          </div>

          <div className="flex flex-col">
            <button
              type="button"
              className="flex w-full items-center gap-2"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              <p className="text-sm text-neutral-600">
                {showAdvancedOptions ? "Hide" : "Show"} advanced settings
              </p>
              <motion.div
                animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
                className="text-neutral-600"
              >
                <ChevronDown className="size-4" />
              </motion.div>
            </button>

            <AnimatedSizeContainer height className="flex flex-col">
              {showAdvancedOptions &&
                ADVANCED_OPTIONS.map(
                  ({ id, title, description, icon: Icon, proFeature }) => {
                    return (
                      <div key={id} className="mt-4 flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
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
                            checked={showOptionStates[id]}
                            fn={(checked: boolean) => {
                              setShowOptionStates((prev) => ({
                                ...prev,
                                [id]: checked,
                              }));
                              if (!checked) {
                                setValue(id, "", {
                                  shouldDirty: true,
                                });
                              }
                            }}
                            disabled={isSubmitting}
                          />
                        </div>

                        {showOptionStates[id] && (
                          <div className="rounded-md border border-neutral-200 bg-white">
                            <textarea
                              {...register(id)}
                              className="w-full resize-none rounded-md border-0 bg-transparent px-3 py-2 font-mono text-xs text-neutral-700 focus:outline-none focus:ring-0"
                              rows={4}
                              spellCheck={false}
                              onPaste={(e) => {
                                if (
                                  [
                                    "appleAppSiteAssociation",
                                    "assetLinks",
                                  ].includes(id)
                                ) {
                                  e.preventDefault();
                                  const pastedText =
                                    e.clipboardData.getData("text");

                                  try {
                                    const formattedJson = JSON.stringify(
                                      JSON.parse(pastedText),
                                      null,
                                      2,
                                    );
                                    setValue(id, formattedJson, {
                                      shouldDirty: true,
                                    });
                                  } catch (err) {
                                    setValue(id, pastedText, {
                                      shouldDirty: true,
                                    });
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
            </AnimatedSizeContainer>
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

const DOMAIN_OPTIONS: {
  id: keyof FormData;
  title: string;
  description: string;
  icon: any;
  proFeature?: boolean;
}[] = [
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
    proFeature: true,
  },
  {
    id: "notFoundUrl",
    title: "Not found URL",
    description: "Where to redirect when shortlinks don't exist",
    icon: Binoculars,
    proFeature: true,
  },
  {
    id: "placeholder",
    title: "Input placeholder URL",
    description: "Which placeholder URL to show in the link builder",
    icon: TextCursorInput,
  },
];

const ADVANCED_OPTIONS = [
  {
    id: "appleAppSiteAssociation",
    title: "Apple App Site Association",
    description: "Provide a config file for iOS deep linking",
    icon: AppleLogo,
    proFeature: true,
  },
  {
    id: "assetLinks",
    title: "Asset Link",
    description: "Provide a config file for Android deep linking",
    icon: AndroidLogo,
    proFeature: true,
  },
] as const;
