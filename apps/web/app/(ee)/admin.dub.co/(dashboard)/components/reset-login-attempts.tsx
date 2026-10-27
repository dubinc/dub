"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function ResetLoginAttempts() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) =>
          await fetch("/api/admin/reset-login-attempts", {
            method: "POST",
            body: JSON.stringify({
              email: data.get("email"),
            }),
          })
            .then((res) => res.json())
            .then((res) => {
              if (res.error) {
                toast.error(res.error);
              } else {
                toast.success("Login attempts have been reset");
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
        placeholder="user@example.com"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
