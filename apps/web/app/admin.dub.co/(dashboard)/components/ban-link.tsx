"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function BanLink() {
  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (data) =>
          await fetch(
            `/api/admin/links/ban?domain=dub.sh&key=${data.get("key")}`,
            {
              method: "DELETE",
            },
          )
            .then((res) => res.json())
            .then((res) => {
              if (res.error) {
                toast.error(res.error);
              } else {
                toast.success("Link has been banned");
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
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-5 text-neutral-500 sm:text-sm">
        dub.sh
      </span>
      <input
        name="key"
        id="key"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-r-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
          pending && "bg-neutral-100",
        )}
        placeholder="IG47WZs"
        aria-invalid="true"
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          // if pasting in https://dub.sh/xxx or dub.sh/xxx, extract xxx
          const text = e.clipboardData.getData("text/plain");
          if (
            text.startsWith("https://dub.sh/") ||
            text.startsWith("dub.sh/")
          ) {
            e.currentTarget.value = text
              .replace("https://dub.sh/", "")
              .replace("dub.sh/", "");
          } else {
            e.currentTarget.value = text;
          }
        }}
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};
