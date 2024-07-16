"use client";

import z from "@/lib/zod";
import { signInSchema } from "@/lib/zod/schemas/auth";
import { Button } from "@dub/ui";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const errorCodes = {
  "no-credentials": "Please provide an email and password.",
  "invalid-credentials": "Email or password is incorrect.",
};

export const SignInWithEmailPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { isLoading, isSubmitting },
  } = useForm<z.infer<typeof signInSchema>>({
    defaultValues: { email: "", password: "" },
  });

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
        throw new Error(errorCodes[response.error]);
      }

      if (response.url) {
        toast.success("Redirecting...");
        router.replace(response.url);
        return;
      }
    } catch (error) {
      toast.error(error.message);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col space-y-4">
        <input
          type="email"
          placeholder="panic@thedis.co"
          autoComplete="email"
          required
          {...register("email")}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
        />
        <input
          type="password"
          placeholder="********"
          autoComplete="password"
          required
          {...register("password")}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
        />
        <Button
          text="Sign in"
          type="submit"
          loading={isLoading}
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
};
