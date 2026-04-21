"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function SlackSupportInvite() {
  const [needsChannelId, setNeedsChannelId] = useState(false);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) => {
          try {
            const res = await fetch("/api/admin/slack-support-invite", {
              method: "POST",
              body: JSON.stringify({
                email: data.get("email"),
                workspaceSlug: data.get("workspaceSlug"),
                channelId: data.get("channelId") || undefined,
              }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
              if (json.nameTaken) {
                setNeedsChannelId(true);
              }
              toast.error(
                json.error ?? "Something went wrong. Please try again.",
              );
              return;
            }

            setNeedsChannelId(false);
            toast.success(`Slack invite sent (ID: ${json.inviteId})`);
          } catch {
            toast.error(
              "Network error. Please check your connection and try again.",
            );
          }
        }}
      >
        <Form needsChannelId={needsChannelId} />
      </form>
    </div>
  );
}

const Form = ({ needsChannelId }: { needsChannelId: boolean }) => {
  const { pending } = useFormStatus();

  const inputClass = cn(
    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
    pending && "bg-neutral-100",
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex w-full rounded-md shadow-sm">
        <input
          name="email"
          id="email"
          type="email"
          required
          disabled={pending}
          autoComplete="off"
          className={inputClass}
          placeholder="user@example.com"
        />
        {pending && (
          <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
        )}
      </div>

      <div className="relative flex w-full rounded-md shadow-sm">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
          app.dub.co/
        </span>
        <input
          name="workspaceSlug"
          id="workspaceSlug"
          type="text"
          required
          disabled={pending}
          autoComplete="off"
          className={cn(
            "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
            pending && "bg-neutral-100",
          )}
          placeholder="acme"
        />
        {pending && (
          <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
        )}
      </div>

      {needsChannelId && (
        <div className="relative flex w-full rounded-md shadow-sm">
          <input
            name="channelId"
            id="channelId"
            type="text"
            required
            disabled={pending}
            autoComplete="off"
            className={inputClass}
            placeholder="Slack channel ID (e.g. C01234ABCDE)"
            pattern="^[CG][A-Z0-9]{8,}$"
          />
          {pending && (
            <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none",
          pending && "opacity-50",
        )}
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </div>
  );
};
