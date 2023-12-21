"use client";

import { Button, Copy, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { deleteAndBlacklistLink, getLinkByKey } from "../actions";

export default function DeleteLink() {
  const [data, setData] = useState<{
    key: string;
    url: string;
    domain: string;
  } | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={(data) =>
          getLinkByKey(data).then((res) => {
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
            deleteAndBlacklistLink(formData).then(() => {
              toast.success("Successfully deleted link and blacklisted domain");
              router.refresh();
            });
          }}
          className="flex w-full flex-col space-y-4 rounded-md border-t border-gray-200 py-4"
        >
          <div className="flex space-x-2">
            <input
              type="text"
              name="key"
              id={data.key}
              value={data.key}
              readOnly
              className="max-w-fit rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            />
            <input
              type="url"
              name="url"
              id={data.url}
              value={data.url}
              readOnly
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
            />
          </div>
          <div key={data.domain} className="space-x-2">
            <input
              type="checkbox"
              id={data.domain}
              name="hostname"
              value={data.domain}
              defaultChecked
            />
            <label htmlFor={data.domain}>{data.domain}</label>
          </div>
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
        placeholder="xxx"
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
  return (
    <Button text="Delete and blacklist" loading={pending} variant="danger" />
  );
};
