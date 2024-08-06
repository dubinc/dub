"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function RefreshDomain() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) =>
          await fetch("/api/admin/refresh-domain", {
            method: "POST",
            body: JSON.stringify({
              domain: data.get("domain"),
            }),
          })
            .then((res) => res.json())
            .then((res) => {
              if (res.error) {
                toast.error(res.error);
              } else {
                toast.success("Domain has been refreshed");
              }
            })
        }
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
        id="domain"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500",
          pending && "bg-gray-100",
        )}
        placeholder="acme.com"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-gray-400" />
      )}
    </div>
  );
};
