"use client";

import { createUserAccountAction } from "@/lib/actions/create-user-account.ts";
import z from "@/lib/zod";
import { signUpSchema } from "@/lib/zod/schemas/auth";
import { QRBuilderData } from "@/ui/modals/qr-builder";
import { Button, Input, useLocalStorage } from "@dub/ui";
import slugify from "@sindresorhus/slugify";
import { signIn } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
// import { useRegisterContext } from "./context";

type SignUpProps = z.infer<typeof signUpSchema>;

export const SignUpEmail = () => {
  const router = useRouter();
  // const { setStep, setEmail, setPassword } = useRegisterContext();

  const {
    register,
    // handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpProps>({
    defaultValues: {
      password: "defaultPassword12Secret",
    },
  });

  // const { executeAsync, isPending } = useAction(sendOtpAction, {
  //   onSuccess: () => {
  //     setEmail(getValues("email"));
  //     setPassword(getValues("password"));
  //     setStep("verify");
  //   },
  //   onError: ({ error }) => {
  //     toast.error(
  //       error.serverError ||
  //         error.validationErrors?.email?.[0] ||
  //         error.validationErrors?.password?.[0],
  //     );
  //   },
  // });

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>("qr-data-to-create", null);

  const { executeAsync, isPending } = useAction(createUserAccountAction, {
    async onSuccess() {
      const { email, password } = getValues();

      toast.success("Account created! Redirecting to dashboard...");
      setIsRedirecting(true);
      setQrDataToCreate(null);
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.ok) {
        // router.push("/onboarding");
        router.push(`/${slugify(email)}?onboarded=true`);
      } else {
        toast.error(
          "Failed to sign in with credentials. Please try again or contact support.",
        );
      }
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const formValues = getValues();
        const { email, password } = formValues;

        await executeAsync({
          email,
          password,
          qrDataToCreate,
        });
      }}
    >
      <div className="flex flex-col space-y-4">
        <Input
          type="email"
          placeholder="Your Email"
          autoComplete="email"
          required
          {...register("email")}
          error={errors.email?.message}
          className="border-border-500 focus:border-secondary"
        />
        <Input
          containerClassName="hidden"
          type="password"
          placeholder="Password"
          required
          {...register("password")}
          error={errors.password?.message}
          minLength={8}
        />
        <Button
          type="submit"
          text={isPending ? "Creating account..." : "Sign Up"}
          disabled={isPending || isRedirecting}
          loading={isPending || isRedirecting}
        />
      </div>
    </form>
  );
};
