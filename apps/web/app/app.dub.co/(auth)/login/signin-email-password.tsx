"use client";

import z from "@/lib/zod";
import { signInSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const errorCodes = {
  "no-credentials": "Please provide an email and password.",
  "invalid-credentials": "Email or password is incorrect.",
  "exceeded-login-attempts":
    "Account has been locked due to too many login attempts. Please contact support to unlock your account.",
};

export const SignInWithEmailPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    resetField,
    handleSubmit,
    formState: { isSubmitting, disabled },
  } = useForm<z.infer<typeof signInSchema>>();

  const onSubmit = handleSubmit(async (data) => {
    try {
      const response = await signIn("credentials", {
        ...data,
        redirect: false,
        callbackUrl: searchParams.get("next") || "/",
      });

      if (!response) {
        return;
      }

      if (!response.ok && response.error) {
        resetField("password");
        throw new Error(errorCodes[response.error]);
      }

      if (response.url) {
        toast.success("Redirecting...");
        router.replace(response.url);
        return;
      }
    } catch (error) {
      setError(error.message);
    }
  });

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-red-100 p-3 text-red-900 dark:bg-red-900 dark:text-red-200">
          <div className="relative flex md:flex-row">
            <div className="flex flex-grow flex-col sm:flex-row">
              <div className="ltr:ml-3 rtl:mr-3">
                <h3 className="text-sm font-medium">
                  {errorCodes[error] || error}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="flex flex-col space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            {...register("email")}
          />
          <Input
            type="password"
            placeholder="Password"
            required
            {...register("password")}
          />
          <Button
            text="Sign In"
            type="submit"
            loading={isSubmitting}
            disabled={disabled}
          />
        </div>
      </form>
    </>
  );
};
