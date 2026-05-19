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
          try {
            const domain = data.get("domain")?.toString().trim();

            if (!domain) {
              toast.error("Please enter a domain.");
              return;
            }

            const confirmed = window.confirm(
              `Are you sure you want to renew ${domain}?`,
            );
            if (!confirmed) return;

            const res = await fetch("/api/admin/renew-domain", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                domain,
              }),
            });

            const text = await res.text();
            let payload: Record<string, unknown> = {};
            try {
              payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
            } catch {
              payload = {};
            }

            if (!res.ok) {
              toast.error(
                typeof payload.error === "string"
                  ? payload.error
                  : text.trim().slice(0, 200) || "Request failed",
              );
              return;
            }

            const message =
              typeof payload.message === "string"
                ? payload.message
                : "Renewal initiated";
            const invoiceId =
              typeof payload.invoiceId === "string"
                ? payload.invoiceId
                : undefined;
            const paymentIntentStatus =
              typeof payload.paymentIntentStatus === "string"
                ? payload.paymentIntentStatus
                : undefined;

            toast.success(message, {
              description: invoiceId
                ? `Invoice: ${invoiceId}${
                    paymentIntentStatus
                      ? ` · Payment status: ${paymentIntentStatus}`
                      : ""
                  }`
                : undefined,
            });
          } catch {
            toast.error(
              "Could not reach the server or complete renewal. Check your connection and try again.",
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
