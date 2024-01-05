"use client";

import { Button, Copy, LoadingSpinner, Tick } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { banUser, getUserByKey } from "../actions";

export default function BanUser() {
  const [data, setData] = useState<{
    email: string;
    hostnames: string[];
    proProjectSlugs: string[];
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
          action={(formData) => {
            if (
              data.proProjectSlugs.length > 0 ||
              data.verifiedDomains.length > 0
            ) {
              if (
                !confirm(
                  `This user has ${data.proProjectSlugs.length} pro projects and ${data.verifiedDomains.length} verified domains. Are you sure you want to ban them?`,
                )
              ) {
                return;
              }
            }
            banUser(formData).then(() => {
              toast.success("Successfully banned user");
              router.refresh();
            });
          }}
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
          {data.proProjectSlugs.length > 0 && (
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-semibold">Pro Projects</p>
              {data.proProjectSlugs.map((slug) => (
                <div
                  key={slug}
                  className="rounded-md border border-gray-300 p-2 text-sm text-gray-500"
                >
                  {slug}
                </div>
              ))}
            </div>
          )}
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
          <BanButton />
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

const BanButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Confirm Ban" loading={pending} variant="danger" />;
};
