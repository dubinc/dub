"use client";
import { useTranslations } from "next-intl";

import { sendOtpAction } from "@/lib/actions/send-otp";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { Button, Input } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRegisterContext } from "./context";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = () => {
  const t = useTranslations("../ui/auth/register");

  const { setStep, setEmail, setPassword } = useRegisterContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpProps>();

  const { executeAsync, isExecuting } = useAction(sendOtpAction, {
    onSuccess: () => {
      setEmail(getValues("email"));
      setPassword(getValues("password"));
      setStep("verify");
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
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
            placeholder={t("work-email")}
            autoComplete="email"
            required
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            type="password"
            placeholder={t("password")}
            required
            {...register("password")}
            error={errors.password?.message}
          />
          <Button
            type="submit"
            text={isExecuting ? "Submitting..." : "Sign Up"}
            disabled={isExecuting}
            loading={isExecuting}
          />
        </div>
      </form>
    </>
  );
};
