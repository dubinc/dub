"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function RenewDomain() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) => {
          const res = await fetch("/api/admin/renew-domain", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domain: data.get("domain"),
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error ?? "Request failed");
            return;
          }
          toast.success(json.message ?? "Renewal initiated", {
            description: json.invoiceId
              ? `Invoice: ${json.invoiceId}${
                  json.paymentIntentStatus
                    ? ` · Payment status: ${json.paymentIntentStatus}`
                    : ""
                }`
              : undefined,
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
        name="domain"
        id="renew-domain"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          pending && "bg-neutral-100",
        )}
        placeholder="acme.link"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
