"use client";

import { cn } from "#/lib/utils";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { LoadingSpinner } from "#/ui/icons";
import { getProjectOwner } from "../actions";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Tick } from "@/components/shared/icons";

export default function ImpersonateProject() {
  const [data, setData] = useState<{
    email: string;
    impersonateUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={(data) =>
          getProjectOwner(data).then((res) => {
            if (res.error) {
              toast.error(res.error);
            } else {
              // @ts-ignore
              setData(res);
            }
          })
        }
      >
        <Form />
      </form>
      {data && (
        <div className="flex w-full items-center space-x-3">
          <input
            type="email"
            name="email"
            id="email"
            value={data.email}
            readOnly
            className="w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          />
          <button
            type="button"
            onClick={() => {
              setCopied(true);
              navigator.clipboard.writeText(data.impersonateUrl);
              toast.success("Copied to clipboard");
              setTimeout(() => {
                setCopied(false);
              }, 3000);
            }}
            className="rounded-md border border-gray-300 p-2"
          >
            {copied ? (
              <Tick className="h-5 w-5 text-gray-500" />
            ) : (
              <Copy className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const Form = () => {
  const { pending } = useFormStatus();

  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-gray-500 sm:text-sm">
        app.dub.co
      </span>
      <input
        name="slug"
        id="slug"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-r-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500",
          pending && "bg-gray-100",
        )}
        placeholder="owd"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-gray-400" />
      )}
    </div>
  );
};
