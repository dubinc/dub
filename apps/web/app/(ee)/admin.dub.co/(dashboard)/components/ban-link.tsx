"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function BanLink() {
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [banApexDomain, setBanApexDomain] = useState(false);
  const [term, setTerm] = useState("");
  const [loadingTerm, setLoadingTerm] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const suggestedKey = useRef("");
  const requestId = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestedTerm = async (key: string) => {
    const normalized = key.trim();
    if (!normalized) return null;

    const id = ++requestId.current;
    suggestedKey.current = normalized;
    setLoadingTerm(true);
    setTerm("");

    try {
      const res = await fetch(
        `/api/admin/links/ban?domain=dub.sh&key=${encodeURIComponent(normalized)}`,
      ).then((r) => r.json());

      if (id !== requestId.current) return null;

      if (res.error) {
        toast.error(res.error);
        suggestedKey.current = "";
        return null;
      }

      let nextTerm = res.term as string;
      setTerm((current) => {
        nextTerm = current.trim() || nextTerm;
        return nextTerm;
      });
      return nextTerm;
    } catch {
      if (id === requestId.current) {
        toast.error("Failed to look up link");
        suggestedKey.current = "";
      }
      return null;
    } finally {
      if (id === requestId.current) setLoadingTerm(false);
    }
  };

  const handleKeyChange = (key: string) => {
    setKey(key);
    if (!banApexDomain) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (key.trim() === suggestedKey.current) return;
      void loadSuggestedTerm(key);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const key = new FormData(form).get("key");
    if (!key || typeof key !== "string") return;

    let termToBan = term.trim();

    if (banApexDomain && (key.trim() !== suggestedKey.current || !termToBan)) {
      termToBan = (await loadSuggestedTerm(key))?.trim() ?? "";
      if (!termToBan) return;
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
        domain: "dub.sh",
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
          keyRef={keyRef}
          onKeyChange={handleKeyChange}
        />
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={banApexDomain}
            disabled={pending}
            onChange={(e) => {
              const checked = e.target.checked;
              setBanApexDomain(checked);
              if (!checked) return;

              const key = keyRef.current?.value ?? "";
              if (key.trim() && key.trim() !== suggestedKey.current) {
                void loadSuggestedTerm(key);
              }
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
              disabled={pending || loadingTerm}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setTerm(e.target.value)}
              placeholder=".example.com"
              className={cn(
                "block w-full rounded-md border-neutral-300 font-mono text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                (pending || loadingTerm) && "bg-neutral-100",
              )}
            />
            {loadingTerm && (
              <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
            )}
          </div>
        )}
        <div className="mt-4">
          <Button
            text="Confirm Ban"
            variant="danger"
            loading={pending}
            disabled={
              !key.trim() ||
              (banApexDomain && !term.trim()) ||
              loadingTerm ||
              pending
            }
          />
        </div>
      </form>
    </div>
  );
}

const Form = ({
  pending,
  keyRef,
  onKeyChange,
}: {
  pending: boolean;
  keyRef: React.RefObject<HTMLInputElement | null>;
  onKeyChange: (key: string) => void;
}) => {
  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-5 text-neutral-500 sm:text-sm">
        dub.sh
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
          // if pasting in https://dub.sh/xxx or dub.sh/xxx, extract xxx
          const text = e.clipboardData.getData("text/plain");
          const key =
            text.startsWith("https://dub.sh/") || text.startsWith("dub.sh/")
              ? text.replace("https://dub.sh/", "").replace("dub.sh/", "")
              : text;
          e.currentTarget.value = key;
          onKeyChange(key);
        }}
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
