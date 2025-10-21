"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function DeleteStripeExpress() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          await fetch("/api/admin/delete-stripe-express", {
            method: "POST",
            body: JSON.stringify({
              email: formData.get("email"),
            }),
          }).then(async (res) => {
            if (res.ok) {
              toast.success("Stripe express account deleted!");
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
  );
};
