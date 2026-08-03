"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function DisableRestoreWorkspace() {
  const [pending, setPending] = useState<"disable" | "restore" | null>(null);
  const slugRef = useRef<HTMLInputElement>(null);

  const handleAction = async (
    action: "disable" | "restore",
    slug: string,
  ) => {
    const message =
      action === "disable"
        ? `Are you sure you want to disable all links for workspace "${slug}"? This will also downgrade owners to billing and members to viewer, and notify workspace owners by email.`
        : `Are you sure you want to restore all links for workspace "${slug}"? This will also revert billing users to owner and viewers to member.`;

    if (!window.confirm(message)) return;

    setPending(action);
    try {
      const res = await fetch(`/api/admin/workspaces/${action}`, {
        method: "POST",
        body: JSON.stringify({ slug }),
      });

      if (res.ok) {
        toast.success(
          action === "disable"
            ? "Workspace links disabled"
            : "Workspace links restored",
        );
      } else {
        const error = await res.text();
        toast.error(error || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const slug = new FormData(e.currentTarget).get("slug");
          if (!slug || typeof slug !== "string") return;
          handleAction("disable", slug);
        }}
      >
        <Form slugRef={slugRef} pending={pending} onRestore={handleAction.bind(null, "restore")} />
      </form>
    </div>
  );
}

const Form = ({
  slugRef,
  pending,
  onRestore,
}: {
  slugRef: React.RefObject<HTMLInputElement | null>;
  pending: "disable" | "restore" | null;
  onRestore: (slug: string) => void;
}) => {
  const isPending = pending !== null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex w-full rounded-md shadow-sm">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
          app.dub.co
        </span>
        <input
          ref={slugRef}
          name="slug"
          id="workspace-slug"
          type="text"
          required
          disabled={isPending}
          autoComplete="off"
          className={cn(
            "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
            isPending && "bg-neutral-100",
          )}
          placeholder="acme"
        />
        {isPending && (
          <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none",
            isPending && "opacity-50",
          )}
        >
          {pending === "disable" ? "Disabling…" : "Disable links"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const input = slugRef.current;
            if (!input?.value) {
              input?.reportValidity();
              return;
            }
            onRestore(input.value);
          }}
          className={cn(
            "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none",
            isPending && "opacity-50",
          )}
        >
          {pending === "restore" ? "Restoring…" : "Restore links"}
        </button>
      </div>
    </div>
  );
};
