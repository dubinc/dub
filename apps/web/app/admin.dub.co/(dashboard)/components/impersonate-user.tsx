"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import UserInfo, { UserInfoProps } from "./user-info";

export default function ImpersonateUser() {
  const [data, setData] = useState<UserInfoProps | null>(null);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={async (formData) => {
          await fetch("/api/admin/impersonate", {
            method: "POST",
            body: JSON.stringify({
              email: formData.get("email"),
            }),
          }).then(async (res) => {
            if (res.ok) {
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
          action={async (formData) => {
            if (
              !confirm(
                `This will ban the user ${data.email} and delete all their workspaces and links. Are you sure?`,
              )
            ) {
              return;
            }
            await fetch("/api/admin/ban", {
              method: "POST",
              body: JSON.stringify({
                email: data.email,
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

const BanButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Confirm Ban" loading={pending} variant="danger" />;
};
