"use client";

import { createNewAccount } from "@/lib/actions/create-new-account";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const SignUpWithEmailPassword = () => {
  const router = useRouter();
  const { executeAsync, result, status, isExecuting } =
    useAction(createNewAccount);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof signUpSchema>>({
    // resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "kiran@dub.co",
      password: "1234aB#",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await executeAsync(data);

    if (status === "hasSucceeded") {
      toast.success("account created");
      reset();
    }
  });

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

      <form onSubmit={onSubmit}>
        <div className="flex flex-col space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            {...register("email")}
            error={result.validationErrors?.email?.[0] || errors.email?.message}
          />
          <Input
            type="password"
            placeholder="Password"
            required
            {...register("password")}
            error={
              result.validationErrors?.password?.[0] || errors.password?.message
            }
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
