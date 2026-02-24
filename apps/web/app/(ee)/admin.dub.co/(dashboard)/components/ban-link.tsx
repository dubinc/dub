"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";

export function BanLink() {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const key = new FormData(form).get("key");
    if (!key || typeof key !== "string") return;

    if (!window.confirm("Are you sure you want to ban this link?")) return;

    setPending(true);
    try {
      const res = await fetch(
        `/api/admin/links/ban?domain=dub.sh&key=${encodeURIComponent(key)}`,
        { method: "DELETE" },
      ).then((r) => r.json());
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Link has been banned");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      <form onSubmit={handleSubmit}>
        <Form pending={pending} />
      </form>
    </div>
  );
}

const Form = ({ pending }: { pending: boolean }) => {
  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-5 text-neutral-500 sm:text-sm">
        dub.sh
      </span>
      <input
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
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          // if pasting in https://dub.sh/xxx or dub.sh/xxx, extract xxx
          const text = e.clipboardData.getData("text/plain");
          if (
            text.startsWith("https://dub.sh/") ||
            text.startsWith("dub.sh/")
          ) {
            e.currentTarget.value = text
              .replace("https://dub.sh/", "")
              .replace("dub.sh/", "");
          } else {
            e.currentTarget.value = text;
          }
        }}
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
