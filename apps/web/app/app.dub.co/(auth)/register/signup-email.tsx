"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const SignUpEmail = () => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "kiran@example.com",
      password: "12345678Ab@",
    },
  });

  const { executeAsync, result, status, isExecuting } = useAction(
    createUserAccountAction,
    {
      onSuccess: () => {
        toast.success(
          "Account created successfully. Please verify your email to login.",
        );
        router.push(
          `/register/verify-email?email=${encodeURIComponent(
            getValues("email"),
          )}`,
        );
      },
    },
  );

  return (
    <>
      {result.serverError && (
        <div className="rounded-md bg-red-100 p-3 text-red-900 dark:bg-red-900 dark:text-red-200">
          <div className="relative flex md:flex-row">
            <div className="flex flex-grow flex-col sm:flex-row">
              <div className="ltr:ml-3 rtl:mr-3">
                <h3 className="text-sm font-medium">
                  {result.serverError.serverError}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(async (data) => {
          await executeAsync(data);
        })}
      >
        <div className="flex flex-col space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            type="password"
            placeholder="Password"
            required
            {...register("password")}
            error={errors.password?.message}
          />
          <Button
            text={status === "executing" ? "Signing Up..." : "Sign Up"}
            type="submit"
            loading={isExecuting}
            disabled={!isDirty}
          />
        </div>
      </form>
    </>
  );
};
