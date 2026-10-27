"use client";

import { Button, LinkLogo, LoadingSpinner } from "@dub/ui";
import { ArrowUpRight2 } from "@dub/ui/icons";
import {
  cn,
  getApexDomain,
  getPrettyUrl,
  isSafeLinkHref,
  SHORT_DOMAIN,
} from "@dub/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImpersonateResult } from "./impersonate-user";
import { UserInfoProps } from "./user-info";

type LinkLookup = UserInfoProps & {
  link: {
    url: string;
  };
};

export function BanLink() {
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [banApexDomain, setBanApexDomain] = useState(false);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<LinkLookup | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const banApexDomainRef = useRef(banApexDomain);
  const termTouched = useRef(false);

  banApexDomainRef.current = banApexDomain;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const lookupLink = async (key: string, existingId?: number) => {
    const normalized = key.trim();
    if (!normalized) return null;

    const id = existingId ?? ++requestId.current;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({
          query: dubShortLinkQuery(normalized),
        }),
      });

      if (id !== requestId.current) return null;

      if (!res.ok) {
        const error = await res.text();
        setLinkInfo(null);
        if (res.status === 404) {
          setLookupError(error);
        } else {
          toast.error(error);
          setLookupError(null);
        }
        return null;
      }

      const data = (await res.json()) as LinkLookup;
      if (!data.link?.url) {
        setLinkInfo(null);
        setLookupError("Link not found");
        return null;
      }

      setLookupError(null);
      setLinkInfo(data);
      if (banApexDomainRef.current && !termTouched.current) {
        setTerm(apexTerm(data.link.url));
      }
      return data;
    } catch {
      if (id === requestId.current) {
        toast.error("Failed to look up link");
        setLinkInfo(null);
        setLookupError(null);
      }
      return null;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const handleKeyChange = (value: string) => {
    setKey(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const id = ++requestId.current;
    termTouched.current = false;
    setTerm("");
    setLookupError(null);
    setLinkInfo(null);

    const normalized = value.trim();
    if (!normalized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void lookupLink(normalized, id);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;

    const form = e.currentTarget;
    const rawKey = new FormData(form).get("key");
    if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) return;
    const key = rawKey.trim();

    let termToBan = term.trim();

    if (banApexDomain && !termToBan) {
      const data = linkInfo ?? (await lookupLink(key));
      termToBan = apexTerm(data?.link.url ?? "");
      if (!termToBan) {
        toast.error("Could not determine the apex domain");
        return;
      }
    }

    if (
      !window.confirm(
        banApexDomain
          ? `Are you sure you want to ban this link and the term "${termToBan}"?`
          : "Are you sure you want to ban this link?",
      )
    )
      return;

    setPending(true);
    try {
      const params = new URLSearchParams({
        domain: SHORT_DOMAIN,
        key,
      });
      if (banApexDomain) params.set("term", termToBan);

      const res = await fetch(`/api/admin/links/ban?${params}`, {
        method: "DELETE",
      }).then((r) => r.json());
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          banApexDomain
            ? `Link banned and ${termToBan} added to the blocklist`
            : "Link has been banned",
        );
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      <form onSubmit={handleSubmit}>
        <Form
          pending={pending}
          loading={loading}
          keyRef={keyRef}
          onKeyChange={handleKeyChange}
        />
        {lookupError && (
          <p className="mt-2 text-sm text-red-600">{lookupError}</p>
        )}
        {linkInfo && <LinkPreview data={linkInfo} />}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={banApexDomain}
            disabled={pending}
            onChange={(e) => {
              const checked = e.target.checked;
              setBanApexDomain(checked);
              if (!checked) return;
              termTouched.current = false;
              if (linkInfo?.link.url) setTerm(apexTerm(linkInfo.link.url));
            }}
            className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
          />
          Ban apex domain
        </label>
        {banApexDomain && (
          <div className="relative mt-3">
            <input
              name="term"
              id="term"
              type="text"
              value={term}
              disabled={pending || loading}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                termTouched.current = true;
                setTerm(e.target.value);
              }}
              placeholder=".example.com"
              className={cn(
                "block w-full rounded-md border-neutral-300 font-mono text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                (pending || loading) && "bg-neutral-100",
              )}
            />
            {loading && (
              <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
            )}
          </div>
        )}
        <div className="mt-4">
          <Button
            text="Ban link"
            variant="danger"
            loading={pending}
            disabled={
              !key.trim() ||
              (banApexDomain && !term.trim()) ||
              loading ||
              pending
            }
          />
        </div>
      </form>
      {linkInfo && (
        <ImpersonateResult key={linkInfo.impersonateUrl.app} data={linkInfo} />
      )}
    </div>
  );
}

function LinkPreview({ data }: { data: LinkLookup }) {
  const { link } = data;
  const apexDomain = getApexDomain(link.url);
  const destinationHref = isSafeLinkHref(link.url) ? link.url : undefined;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="relative flex-none rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 p-1.5">
          <LinkLogo
            apexDomain={apexDomain}
            className="size-5 shrink-0 sm:size-6"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Destination URL
          </p>
          {destinationHref ? (
            <a
              href={destinationHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 items-center gap-1 text-sm font-medium text-neutral-900"
            >
              <span className="truncate">{getPrettyUrl(link.url)}</span>
              <ArrowUpRight2 className="size-3.5 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-700" />
            </a>
          ) : (
            <p className="truncate text-sm font-medium text-neutral-900">
              {getPrettyUrl(link.url) || link.url}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const Form = ({
  pending,
  loading,
  keyRef,
  onKeyChange,
}: {
  pending: boolean;
  loading: boolean;
  keyRef: React.RefObject<HTMLInputElement | null>;
  onKeyChange: (key: string) => void;
}) => {
  const busy = pending || loading;

  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-5 text-neutral-500 sm:text-sm">
        {SHORT_DOMAIN}
      </span>
      <input
        ref={keyRef}
        name="key"
        id="key"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          pending && "bg-neutral-100",
        )}
        placeholder="IG47WZs"
        aria-invalid="true"
        onChange={(e) => onKeyChange(e.currentTarget.value)}
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          const key = extractDubKey(e.clipboardData.getData("text/plain"));
          e.currentTarget.value = key;
          onKeyChange(key);
        }}
      />
      {busy && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};

function dubShortLinkQuery(key: string) {
  const path = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${SHORT_DOMAIN}/${path}`;
}

function extractDubKey(text: string) {
  const trimmed = text.trim();
  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : trimmed.includes("/")
        ? new URL(`https://${trimmed}`)
        : undefined;
    if (url) {
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (host === SHORT_DOMAIN) {
        return decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
      }
    }
  } catch {
    // keep the pasted text
  }
  return trimmed;
}

function apexTerm(url: string) {
  const apex = getApexDomain(url);
  return apex ? `.${apex}` : "";
}
