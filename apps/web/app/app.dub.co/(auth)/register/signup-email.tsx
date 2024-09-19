"use client";

import { sendOtpAction } from "@/lib/actions/send-otp";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRegisterContext } from "./context";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = () => {
  const { setStep, setEmail, setPassword } = useRegisterContext();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
  } = useForm<SignUpProps>({
    resolver: zodResolver(signUpSchema),
  });

  const { executeAsync, isExecuting } = useAction(sendOtpAction, {
    onSuccess: () => {
      setEmail(getValues("email"));
      setPassword(getValues("password"));
      setStep("verify");
    },
    onError: ({ error }) => {
      toast.error(error.serverError?.serverError);
    },
  });

  return (
    <>
      <form
        onSubmit={handleSubmit((data) => executeAsync({ email: data.email }))}
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
            type="submit"
            text={isExecuting ? "Submitting..." : "Sign Up"}
            disabled={isExecuting || !isValid}
            loading={isExecuting}
          />
        </div>
      </form>
    </>
  );
};
