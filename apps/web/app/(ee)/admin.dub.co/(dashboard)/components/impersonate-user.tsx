"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import UserInfo, { UserInfoProps } from "./user-info";

export function ImpersonateUser() {
  const [data, setData] = useState<UserInfoProps | null>(null);
  const [blockEmailDomain, setBlockEmailDomain] = useState(false);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          await fetch("/api/admin/impersonate", {
            method: "POST",
            body: JSON.stringify({
              query: formData.get("query"),
            }),
          }).then(async (res) => {
            if (res.ok) {
              setBlockEmailDomain(false);
              setData(await res.json());
            } else {
              const error = await res.text();
              toast.error(error);
            }
          });
        }}
      >
        <Form />
      </form>
      {data && (
        <form
          action={async () => {
            const emailDomain = data.email.split("@")[1];
            const blockDomainMessage = blockEmailDomain
              ? ` and block signups from @${emailDomain}`
              : "";

            if (
              !confirm(
                `This will ban the user ${data.email} and delete all their workspaces and links${blockDomainMessage}. Are you sure?`,
              )
            ) {
              return;
            }
            await fetch("/api/admin/ban", {
              method: "POST",
              body: JSON.stringify({
                email: data.email,
                blockEmailDomain,
              }),
            }).then(async (res) => {
              if (res.ok) {
                toast.success("User has been banned");
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
        >
          <UserInfo data={data} />
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={blockEmailDomain}
              onChange={(e) => setBlockEmailDomain(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            Also block signups from @{data.email.split("@")[1]}
          </label>
          <div className="mt-4">
            <BanButton />
          </div>
        </form>
      )}
    </div>
  );
}

const Form = () => {
  const { pending } = useFormStatus();

  return (
    <div className="relative flex w-full rounded-md shadow-sm">
      <input
        name="query"
        id="query"
        type="text"
        required
        disabled={pending}
        autoComplete="off"
        className={cn(
          "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          pending && "bg-neutral-100",
        )}
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          e.preventDefault();
          let text = e.clipboardData.getData("text/plain").trim();
          if (text.toLowerCase().startsWith("mailto:")) {
            text = text.slice(7);
          }
          e.currentTarget.value = text;
        }}
        placeholder="panic@thedis.co, acme, or acme.com"
        aria-invalid="true"
      />
      {pending && (
        <LoadingSpinner className="absolute inset-y-0 right-2 my-auto h-full w-5 text-neutral-400" />
      )}
    </div>
  );
};

const BanButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Confirm Ban" loading={pending} variant="danger" />;
};
