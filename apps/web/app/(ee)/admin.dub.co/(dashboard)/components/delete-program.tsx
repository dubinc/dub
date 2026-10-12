"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function DeleteProgram() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          const programIdOrSlug = formData.get("programIdOrSlug");
          const confirmed = window.confirm(
            `Are you sure you want to delete the program "${programIdOrSlug}"? This will delete all of its commissions, payouts, rewards, discounts, links, customers, partner groups, and enrollments. This action cannot be undone.`,
          );
          if (!confirmed) {
            return;
          }

          await fetch("/api/admin/programs/delete", {
            method: "POST",
            body: JSON.stringify({
              programIdOrSlug,
            }),
          }).then(async (res) => {
            if (res.ok) {
              toast.success("Program deleted!");
            } else {
              const error = await res.text();
              toast.error(error);
            }
          });
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
    <div className="relative flex w-full rounded-md shadow-sm">
      <input
        name="programIdOrSlug"
        id="programIdOrSlug"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          pending && "bg-neutral-100",
        )}
        placeholder="prog_xxx or program-slug"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
