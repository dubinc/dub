"use client";

import { cn } from "#/lib/utils";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { LoadingSpinner } from "#/ui/icons";
import { getUserByKey, banUser } from "../actions";
import { useState } from "react";
import Button from "#/ui/button";
import { toast } from "sonner";
import { Copy, Tick } from "@/components/shared/icons";
import { useRouter } from "next/navigation";

export default function BanUser() {
  const [data, setData] = useState<{
    email: string;
    hostnames: string[];
    verifiedDomains: string[];
    impersonateUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={(data) =>
          getUserByKey(data).then((res) => {
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
        <form
          action={(data) =>
            banUser(data).then(() => {
              toast.success("Successfully banned user");
              router.refresh();
            })
          }
          className="flex w-full flex-col space-y-4 rounded-md border-t border-gray-200 py-4"
        >
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
          {data.verifiedDomains.length > 0 && (
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-semibold">Verified Domains</p>
              {data.verifiedDomains.map((domain) => (
                <div
                  key={domain}
                  className="rounded-md border border-gray-300 p-2 text-sm text-gray-500"
                >
                  {domain}
                </div>
              ))}
            </div>
          )}
          {data.hostnames.map((hostname) => (
            <div key={hostname} className="space-x-2">
              <input
                type="checkbox"
                id={hostname}
                name="hostname"
                value={hostname}
                defaultChecked
              />
              <label htmlFor={hostname}>{hostname}</label>
            </div>
          ))}
          <BanButton disabled={data.verifiedDomains.length > 0} />
        </form>
      )}
    </div>
  );
}

const Form = () => {
  const { pending } = useFormStatus();

  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-gray-500 sm:text-sm">
        dub.sh
      </span>
      <input
        name="key"
        id="key"
        type="text"
        autoFocus
        required
        disabled={pending}
        autoComplete="off"
        onPaste={(e) => {
          // replace http://dub.sh/ or https://dub.sh/ with nothing
          const pastedText = e.clipboardData
            .getData("text")
            .replace(/https?:\/\/dub\.sh\//, "");
          e.currentTarget.value = pastedText;

          // Prevent the default paste behavior
          e.preventDefault();
        }}
        className={cn(
          "block w-full rounded-r-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500",
          pending && "bg-gray-100",
        )}
        placeholder="Sjw30s0"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-gray-400" />
      )}
    </div>
  );
};

const BanButton = ({ disabled }: { disabled?: boolean }) => {
  const { pending } = useFormStatus();
  return (
    <Button
      text="Confirm Ban"
      loading={pending}
      disabled={disabled}
      variant="danger"
    />
  );
};
