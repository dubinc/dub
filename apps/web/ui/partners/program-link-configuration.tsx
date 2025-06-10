import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps } from "@/lib/types";
import DomainConfiguration from "@/ui/domains/domain-configuration";
import { DomainSelector } from "@/ui/domains/domain-selector";
import { InfoTooltip, Input, LinkLogo, SimpleTooltipContent } from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/icons";
import { fetcher, getApexDomain, getPrettyUrl } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Path,
  PathValue,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import useSWRImmutable from "swr/immutable";

interface ProgramLinkConfigurationProps<
  T extends { domain: string; url: string | null },
> {
  domain: string | null;
  url: string | null;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
}

export function ProgramLinkConfiguration<
  T extends { domain: string; url: string | null },
>({ domain, url, register, setValue }: ProgramLinkConfigurationProps<T>) {
  const { id: workspaceId } = useWorkspace();

  const { data: verificationData } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId && domain
      ? `/api/domains/${domain}/verify?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

  const linkStructureOptions = getLinkStructureOptions({
    domain,
    url,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-x-2">
          <label className="block text-sm font-medium text-neutral-800">
            Custom domain
          </label>

          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="A connected domain or sub-domain is required to create a program."
                cta="Learn more"
                href="https://dub.co/help/article/choosing-a-custom-domain"
              />
            }
          />
        </div>

        <DomainSelector
          selectedDomain={domain || ""}
          setSelectedDomain={(domain) =>
            setValue("domain" as Path<T>, domain as PathValue<T, Path<T>>)
          }
        />

        <p className="text-xs font-normal text-neutral-500">
          Custom domain that will be used for your program's referral links
        </p>
      </div>

      <AnimatePresence>
        {domain &&
          verificationData &&
          verificationData.status !== "Valid Configuration" && (
            <motion.div
              key="domain-verification"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-5 pb-5"
            >
              <DomainConfiguration data={verificationData} />
            </motion.div>
          )}
      </AnimatePresence>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-800">
          Destination URL
        </label>
        <Input
          {...register("url" as Path<T>, { required: true })}
          type="url"
          placeholder="https://dub.co"
          className="max-w-full"
        />
        <p className="text-xs font-normal text-neutral-500">
          Where people will be redirected to when they click on your program's
          referral links
        </p>
      </div>

      <AnimatePresence>
        {domain && (
          <motion.div
            key="referral-link-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-base font-medium text-neutral-900">
              Referral link preview
            </h2>

            <div className="rounded-2xl bg-neutral-50 p-2">
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <div className="relative flex shrink-0 items-center">
                  <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
                    <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                  </div>
                  <div className="relative z-10 p-2">
                    {url ? (
                      <LinkLogo
                        apexDomain={getApexDomain(url)}
                        className="size-4 sm:size-6"
                        imageProps={{
                          loading: "lazy",
                        }}
                      />
                    ) : (
                      <div className="size-4 rounded-full bg-neutral-200 sm:size-6" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="truncate text-sm font-medium text-neutral-700">
                    {linkStructureOptions?.[0].example}
                  </div>

                  <div className="flex min-h-[20px] items-center gap-1 text-sm text-neutral-500">
                    {url ? (
                      <>
                        <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                        <span className="truncate">{getPrettyUrl(url)}</span>
                      </>
                    ) : (
                      <div className="h-3 w-1/2 rounded-md bg-neutral-200" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
