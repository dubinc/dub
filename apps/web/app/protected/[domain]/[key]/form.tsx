"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { verifyPassword } from "./action";
import { AlertCircleFill } from "@/components/shared/icons";
import Button from "#/ui/button";
import { toast } from "sonner";

export default function PasswordForm() {
  const { domain, key } = useParams() as {
    domain: string;
    key: string;
  };
  const router = useRouter();

  const [error, setError] = useState(false);

  return (
    <form
      action={(data) =>
        verifyPassword(data).then((res) => {
          if (res.error) {
            setError(true);
            toast.error(res.error);
          } else {
            router.push(res.url!);
          }
        })
      }
      className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
    >
      <div>
        <label htmlFor="password" className="block text-xs text-gray-600">
          PASSWORD
        </label>
        <div className="relative mt-1 rounded-md shadow-sm">
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="key" value={key} />
          <input
            type="password"
            name="password"
            id="password"
            autoFocus
            required
            onChange={() => {
              setError(false);
            }}
            className={`${
              error
                ? "border-red-300 pr-10 text-red-500 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
            } block w-full rounded-md focus:outline-none sm:text-sm`}
          />
          {error && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircleFill
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600" id="slug-error">
            Incorrect password
          </p>
        )}
      </div>

      <FormButton />
    </form>
  );
}

const FormButton = () => {
  const { pending } = useFormStatus();
  return <Button text="Authenticate" loading={pending} />;
};
