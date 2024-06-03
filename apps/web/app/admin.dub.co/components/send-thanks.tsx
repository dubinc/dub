"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function SendThanks() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          if (
            !confirm(
              `This will send an email to ${formData.get("email")} with a thank you message. Are you sure?`,
            )
          ) {
            return;
          }
          await fetch("/api/admin/send-thanks", {
            method: "POST",
            body: JSON.stringify({
              email: formData.get("email"),
            }),
          }).then(async (res) => {
            if (res.ok) {
              toast.success("Successfully sent email");
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
          "block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500",
          pending && "bg-gray-100",
        )}
        placeholder="stey@vercel.com"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-gray-400" />
      )}
    </div>
  );
};
