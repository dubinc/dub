import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  Button,
  buttonVariants,
  SimpleTooltipContent,
  TooltipContent,
  useMediaQuery,
} from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { cn, truncate } from "@dub/utils";
import { CircleCheck, Star } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import { AlertCircleFill, CheckCircleFill } from "../shared/icons";
import { ProBadgeTooltip } from "../shared/pro-badge-tooltip";

interface DomainSearchResult {
  domain: string;
  available: boolean;
  price: string;
  premium: boolean;
}

export function RegisterDomainForm({
  variant = "default",
  saveOnly = false,
  onSuccess,
  onCancel,
}: {
  variant?: "default" | "modal";
  saveOnly?: boolean; // Whether to only save the data without actually sending invites
  onSuccess: (domain: string) => void;
  onCancel?: () => void;
}) {
  const workspace = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [debouncedSlug] = useDebounce(slug, 500);
  const [searchedDomains, setSearchedDomains] = useState<DomainSearchResult[]>(
    [],
  );

  useEffect(() => {
    setSlug(workspace.slug);
  }, [workspace.slug]);

  // Search for domain availability
  const searchDomainAvailability = async () => {
    setIsSearching(true);

    const response = await fetch(
      `/api/domains/search-availability?domain=${slug}.link&workspaceId=${workspace.id}`,
    );

    setIsSearching(false);

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      toast.error("Failed to search for domain availability.");
      return;
    }

    setSearchedDomains(data);
  };

  // Search automatically when the debounced slug changes
  useEffect(() => {
    if (debouncedSlug?.trim()) searchDomainAvailability();
  }, [debouncedSlug]);

  // Register domain
  const registerDomain = async (domain: string) => {
    setIsRegistering(true);

    const baseUrl = saveOnly ? "/api/domains/saved" : "/api/domains/register";

    const response = await fetch(
      `${baseUrl}?domain=${domain}&workspaceId=${workspace.id}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const { error } = await response.json();
      toast.error(error.message);
      setIsRegistering(false);
      return;
    }

    if (saveOnly) {
      toast.custom(() => <DomainSavedToast />, { duration: 7000 });
    } else {
      toast.success("Domain registered successfully!");

      // Mutate workspace, domains links
      await Promise.all([
        mutate(`/api/workspaces/${workspace.slug}`),
        mutate(
          (key) =>
            typeof key === "string" &&
            (key.startsWith(`/api/domains?workspaceId=${workspace.id}`) ||
              key.startsWith(`/api/domains/count?workspaceId=${workspace.id}`)),
        ),
        mutate(
          (key) => typeof key === "string" && key.startsWith("/api/links"),
          undefined,
          { revalidate: true },
        ),
      ]);
    }

    onSuccess(domain.toLowerCase());
  };

  const searchedDomain = searchedDomains.find(
    (d) => d.domain === `${slug}.link`.toLowerCase(),
  );

  const availableDomains = searchedDomains.filter(
    (d) => d.domain !== `${slug}.link`.toLowerCase() && d.available,
  );

  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchedDomain && searchedDomain.available)
          await registerDomain(searchedDomain.domain);
      }}
    >
      <div
        className={cn(
          "flex flex-col gap-y-6 text-left",
          variant === "modal" && "px-4 sm:px-6",
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="block text-sm font-medium text-gray-800">
              Search domains
            </p>

            {workspace.plan === "free" && variant === "modal" && (
              <ProBadgeTooltip
                content={
                  <SimpleTooltipContent
                    title="Search for a free .link domain to use for your short links."
                    cta="Learn more."
                    href="https://dub.co/help/article/free-dot-link-domain"
                  />
                }
              />
            )}
          </div>

          <div className="mt-2">
            <div
              className={cn(
                "-m-1 rounded-[0.625rem] p-1",
                searchedDomain
                  ? searchedDomain.available
                    ? "bg-[#def5c6]"
                    : "bg-orange-100"
                  : "bg-gray-100",
              )}
            >
              <div className="flex rounded-md border border-gray-300 bg-white">
                <input
                  name="domain"
                  id="domain"
                  type="text"
                  required
                  autoComplete="off"
                  className="block w-full rounded-md rounded-r-none border-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
                  aria-invalid="true"
                  autoFocus={!isMobile}
                  placeholder={workspace.slug}
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                  }}
                  // disable enter submit (prevent accidental claims)
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
                <span className="inline-flex items-center rounded-md rounded-l-none bg-white pr-3 font-medium text-gray-500 sm:text-sm">
                  .link
                </span>
              </div>

              <AnimatedSizeContainer
                height
                transition={{ ease: "easeInOut", duration: 0.1 }}
              >
                <div className="flex justify-between gap-3 px-2 pb-2 pt-3 text-sm text-gray-700">
                  <p>
                    {searchedDomain ? (
                      searchedDomain.available ? (
                        <>
                          <span className="font-semibold text-gray-800">
                            {searchedDomain.domain}
                          </span>{" "}
                          is available. Claim your free domain before it's gone!
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-gray-800">
                            {searchedDomain.domain}
                          </span>{" "}
                          is{" "}
                          {searchedDomain.premium
                            ? "a premium domain, which is not available for free, but you can register it on Dynadot."
                            : "not available."}
                        </>
                      )
                    ) : slug?.trim() ? (
                      <>
                        Checking availability for{" "}
                        <strong className="font-semibold">
                          {truncate(`${slug}.link`, 25)}
                        </strong>
                      </>
                    ) : (
                      <>&nbsp;</>
                    )}
                  </p>
                  {isSearching || (!searchedDomain && slug?.trim()) ? (
                    <LoadingSpinner className="mr-0.5 mt-0.5 size-4 shrink-0" />
                  ) : searchedDomain ? (
                    searchedDomain?.available ? (
                      <CheckCircleFill className="size-5 shrink-0 text-green-500" />
                    ) : searchedDomain.premium ? (
                      <Star
                        className="size-5 shrink-0 text-amber-500"
                        fill="currentColor"
                      />
                    ) : (
                      <AlertCircleFill className="size-5 shrink-0 text-amber-500" />
                    )
                  ) : null}
                </div>
              </AnimatedSizeContainer>
            </div>
          </div>
        </div>

        {searchedDomain &&
          !searchedDomain.available &&
          availableDomains.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-800">
                Available alternatives
              </h2>
              <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                <div className="flex flex-col divide-y divide-gray-200">
                  {availableDomains.map((alternative) => (
                    <div
                      key={alternative.domain}
                      className="flex items-center justify-between p-1.5 pl-3 focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <CircleCheck className="size-5 fill-green-500 text-white" />
                        <span className="text-sm font-medium">
                          {alternative.domain}
                        </span>
                      </div>
                      <Button
                        type="button"
                        text="Claim domain"
                        className="h-8 w-fit"
                        onClick={() => registerDomain(alternative.domain)}
                        disabled={
                          isRegistering ||
                          (workspace.plan === "free" && !saveOnly)
                        }
                        disabledTooltip={
                          workspace.plan === "free" && !saveOnly ? (
                            <UpgradeTooltipContent />
                          ) : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {searchedDomain && (
          <p className="-my-2 text-pretty text-left text-sm text-gray-400">
            By claiming your .link domain, you agree to our{" "}
            <a
              href="https://dub.co/help/article/free-dot-link-domain#terms-and-conditions"
              target="_blank"
              className="underline transition-colors hover:text-gray-700"
            >
              terms and conditions
            </a>
          </p>
        )}
      </div>
      <div
        className={cn(
          "mt-8 flex justify-end gap-2",
          variant === "modal" && "border-t border-gray-200 px-4 py-4 sm:px-6",
        )}
      >
        {onCancel && variant === "modal" && (
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={onCancel}
          />
        )}
        {searchedDomain && searchedDomain.premium ? (
          <Link
            href={`https://www.dynadot.com/domain/search?domain=${searchedDomain.domain}`}
            target="_blank"
            className={cn(
              buttonVariants(),
              "flex h-9 w-full items-center justify-center rounded-md border px-4 text-sm",
              variant === "modal" && "w-fit",
            )}
          >
            Register on Dynadot
          </Link>
        ) : (
          <Button
            type="button"
            text="Claim domain"
            className={cn("h-9", variant === "modal" && "w-fit")}
            disabled={!searchedDomain?.available}
            loading={isRegistering}
            disabledTooltip={
              workspace.plan === "free" && !saveOnly ? (
                <UpgradeTooltipContent />
              ) : undefined
            }
          />
        )}
      </div>
    </form>
  );
}

function UpgradeTooltipContent() {
  const { slug } = useWorkspace();
  return (
    <TooltipContent
      title={
        <>
          You can only claim a free <span className="font-semibold">.link</span>{" "}
          domain on a Pro plan and above.
        </>
      }
      cta="Upgrade to Pro"
      onClick={() => window.open(`/${slug}/upgrade?exit=close`)}
    />
  );
}

function DomainSavedToast() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-white p-4 text-sm shadow-[0_4px_12px_#0000001a]">
      <CheckCircleFill className="size-5 shrink-0 text-black" />
      <p className="text-[13px] font-medium text-gray-900">
        Domain saved. You'll need a pro plan to complete the registration.{" "}
        <a
          href="https://dub.co/help/article/free-dot-link-domain"
          target="_blank"
          className="text-gray-500 underline transition-colors hover:text-gray-800"
        >
          Learn more
        </a>
      </p>
    </div>
  );
}
