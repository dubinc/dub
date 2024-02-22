"use client";

import { LoadingSpinner } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { getUserOrProjectOwner } from "../actions";
import UserInfo, { UserInfoProps } from "./user-info";

export default function ImpersonateProject() {
  const [data, setData] = useState<UserInfoProps | null>(null);

  return (
    <div className="flex flex-col space-y-5">
      <form
        action={(data) =>
          getUserOrProjectOwner(data).then((res) => {
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
      {data && <UserInfo data={data} />}
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
