"use client";

import { normalizeDomainInput } from "@/lib/api/domains/normalize-domain-input";
import { Button, LoadingSpinner } from "@dub/ui";
import { cn, currencyFormatter } from "@dub/utils";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

interface DomainSearchResult {
  domain: string;
  available: boolean;
  price: string | null;
  premium: boolean;
  prices: {
    registration: number | null;
    renewal: number | null;
  } | null;
}

function toLinkDomain(input: string) {
  const normalized = normalizeDomainInput(input);
  if (!normalized) return "";
  return normalized.endsWith(".link") ? normalized : `${normalized}.link`;
}

export function RegisterPremiumDomain() {
  const [domain, setDomain] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [debouncedDomain] = useDebounce(domain, 500);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DomainSearchResult | null>(
    null,
  );

  useEffect(() => {
    const linkDomain = toLinkDomain(debouncedDomain);

    if (!linkDomain) {
      setSearchResult(null);
      return;
    }

    const search = async () => {
      setIsSearching(true);

      const response = await fetch(
        `/api/admin/domains/search-availability?domain=${encodeURIComponent(linkDomain)}`,
      );

      setIsSearching(false);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast.error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to search domain availability.",
        );
        setSearchResult(null);
        return;
      }

      const data = (await response.json()) as DomainSearchResult[];
      setSearchResult(
        data.find((result) => result.domain === linkDomain) ?? data[0] ?? null,
      );
    };

    search();
  }, [debouncedDomain]);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) => {
          try {
            const domainInput = data.get("domain")?.toString().trim();
            const workspaceSlug = data.get("workspaceSlug")?.toString().trim();
            const linkDomain = domainInput ? toLinkDomain(domainInput) : "";

            if (!linkDomain) {
              toast.error("Please enter a domain.");
              return;
            }

            if (!workspaceSlug) {
              toast.error("Please enter a workspace slug.");
              return;
            }

            if (!searchResult?.premium || !searchResult.available) {
              toast.error("Domain must be an available premium .link domain.");
              return;
            }

            const priceLabel = searchResult.prices?.registration
              ? currencyFormatter(searchResult.prices.registration, {
                  trailingZeroDisplay: "stripIfInteger",
                })
              : "the listed price";

            const confirmed = window.confirm(
              `Register premium domain "${linkDomain}" for workspace "${workspaceSlug}"? The workspace will be charged ${priceLabel}.`,
            );
            if (!confirmed) return;

            const res = await fetch("/api/admin/domains/register-premium", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                domain: linkDomain,
                workspaceSlug,
              }),
            });

            const text = await res.text();
            let payload: Record<string, unknown> = {};
            try {
              payload = text
                ? (JSON.parse(text) as Record<string, unknown>)
                : {};
            } catch {
              payload = {};
            }

            if (!res.ok) {
              toast.error(
                typeof payload.error === "string"
                  ? payload.error
                  : text.trim().slice(0, 200) || "Request failed",
              );
              return;
            }

            const message =
              typeof payload.message === "string"
                ? payload.message
                : "Registration initiated";
            const invoiceId =
              typeof payload.invoiceId === "string"
                ? payload.invoiceId
                : undefined;
            const paymentIntentStatus =
              typeof payload.paymentIntentStatus === "string"
                ? payload.paymentIntentStatus
                : undefined;

            toast.success(message, {
              description: invoiceId
                ? `Invoice: ${invoiceId}${
                    paymentIntentStatus
                      ? ` · Payment status: ${paymentIntentStatus}`
                      : ""
                  }`
                : undefined,
            });
          } catch {
            toast.error(
              "Could not reach the server or complete registration. Check your connection and try again.",
            );
          }
        }}
      >
        <Form
          domain={domain}
          setDomain={setDomain}
          workspaceSlug={workspaceSlug}
          setWorkspaceSlug={setWorkspaceSlug}
          isSearching={isSearching}
          searchResult={searchResult}
        />
      </form>
    </div>
  );
}

const Form = ({
  domain,
  setDomain,
  workspaceSlug,
  setWorkspaceSlug,
  isSearching,
  searchResult,
}: {
  domain: string;
  setDomain: (domain: string) => void;
  workspaceSlug: string;
  setWorkspaceSlug: (workspaceSlug: string) => void;
  isSearching: boolean;
  searchResult: DomainSearchResult | null;
}) => {
  const { pending } = useFormStatus();
  const linkDomain = toLinkDomain(domain);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="relative flex w-full rounded-md shadow-sm">
          <input
            name="domain"
            id="register-premium-domain"
            type="text"
            required
            disabled={pending}
            autoComplete="off"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={cn(
              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
              pending && "bg-neutral-100",
            )}
            placeholder="domain.link"
          />
          {isSearching && (
            <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
          )}
        </div>
        {(isSearching || searchResult) && (
          <p className="mt-2 text-sm text-neutral-600">
            {isSearching ? (
              <>Checking availability for {linkDomain}...</>
            ) : searchResult ? (
              <>
                <span className="font-medium text-neutral-800">
                  {searchResult.domain}
                </span>{" "}
                is{" "}
                {searchResult.available ? (
                  <>
                    available{" "}
                    {searchResult.premium ? "as a premium domain " : ""}for{" "}
                    {typeof searchResult.prices?.registration === "number" ? (
                      <span className="font-medium text-neutral-800">
                        {currencyFormatter(searchResult.prices.registration, {
                          trailingZeroDisplay: "stripIfInteger",
                        })}
                      </span>
                    ) : (
                      "—"
                    )}
                    {typeof searchResult.prices?.renewal === "number" ? (
                      <>
                        {" "}
                        (renews at{" "}
                        <span className="font-medium text-neutral-800">
                          {currencyFormatter(searchResult.prices.renewal, {
                            trailingZeroDisplay: "stripIfInteger",
                          })}
                          /year
                        </span>
                        )
                      </>
                    ) : (
                      "—"
                    )}
                  </>
                ) : (
                  "not available"
                )}
                .
              </>
            ) : null}
          </p>
        )}
      </div>
      <div className="relative flex w-full rounded-md shadow-sm">
        <input
          name="workspaceSlug"
          id="register-premium-workspace"
          type="text"
          required
          disabled={pending}
          autoComplete="off"
          value={workspaceSlug}
          onChange={(e) => setWorkspaceSlug(e.target.value)}
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
            pending && "bg-neutral-100",
          )}
          placeholder="workspace-slug"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        className="h-9 w-full"
        loading={pending}
        disabled={
          isSearching ||
          !domain.trim() ||
          !workspaceSlug.trim() ||
          !searchResult?.premium ||
          !searchResult?.available
        }
        text={
          searchResult?.premium &&
          searchResult.available &&
          searchResult.prices?.registration
            ? `Register for ${currencyFormatter(
                searchResult.prices.registration,
                {
                  trailingZeroDisplay: "stripIfInteger",
                },
              )}`
            : "Register domain"
        }
      />
    </div>
  );
};
