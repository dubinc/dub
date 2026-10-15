"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function ConvertToSandboxWorkspace() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) => {
          const slug = data.get("slug");

          if (!slug || typeof slug !== "string") {
            return;
          }

          const confirmed = window.confirm(
            `Convert "${slug}" to a sandbox workspace? This sets the environment to sandbox, the plan to Advanced, and applies trial limits.`,
          );

          if (!confirmed) {
            return;
          }

          try {
            const res = await fetch("/api/admin/workspaces/convert-to-sandbox", {
              method: "POST",
              body: JSON.stringify({ slug }),
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
              toast.error(
                json.error ?? "Something went wrong. Please try again.",
              );
              return;
            }

            toast.success(
              `Converted ${json.workspace?.slug ?? slug} to sandbox`,
            );
          } catch {
            toast.error(
              "Network error. Please check your connection and try again.",
            );
          }
        }}
      >
        <Form />
      </form>
    </div>
  );
}

const Form = () => {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex w-full rounded-md shadow-sm">
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
          app.dub.co
        </span>
        <input
          name="slug"
          id="sandbox-workspace-slug"
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

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none",
          pending && "opacity-50",
        )}
      >
        {pending ? "Converting…" : "Convert to sandbox"}
      </button>
    </div>
  );
};
