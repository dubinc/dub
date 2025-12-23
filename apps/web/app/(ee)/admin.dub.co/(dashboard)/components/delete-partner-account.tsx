"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function DeletePartnerAccount() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          const deletePartnerAccount =
            formData.get("deletePartnerAccount") === "on";
          const message = deletePartnerAccount
            ? "Are you sure you want to delete this partner account completely? This will also delete the partner account along with their Stripe express account. This action cannot be undone."
            : "Are you sure you want to delete this partner's Stripe express account? This action cannot be undone.";
          const confirmed = window.confirm(message);
          if (!confirmed) {
            return;
          }

          await fetch("/api/admin/delete-partner-account", {
            method: "POST",
            body: JSON.stringify({
              email: formData.get("email"),
              deletePartnerAccount:
                formData.get("deletePartnerAccount") === "on",
            }),
          }).then(async (res) => {
            if (res.ok) {
              toast.success(
                deletePartnerAccount
                  ? "Partner account deleted!"
                  : "Stripe express account deleted!",
              );
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
    <div className="flex flex-col space-y-4">
      <div className="relative flex w-full rounded-md shadow-sm">
        <input
          name="email"
          id="email"
          type="email"
          required
          disabled={pending}
          autoComplete="off"
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
            pending && "bg-neutral-100",
          )}
          onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
            // remove mailto: on paste
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            if (text.startsWith("mailto:")) {
              e.currentTarget.value = text.replace("mailto:", "");
            } else {
              e.currentTarget.value = text;
            }
          }}
          placeholder="panic@thedis.co"
          aria-invalid="true"
        />
        {pending && (
          <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
        )}
      </div>
      <div className="flex items-center space-x-2">
        <input
          name="deletePartnerAccount"
          id="deletePartnerAccount"
          type="checkbox"
          disabled={pending}
          className="h-4 w-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
        />
        <label
          htmlFor="deletePartnerAccount"
          className="text-sm text-neutral-700"
        >
          Delete partner account as well
        </label>
      </div>
    </div>
  );
};
