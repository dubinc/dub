"use client";

import { Button } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

type FormData = {
  password: string;
  confirmPassword: string;
};

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { isLoading, disabled, errors },
  } = useForm<FormData>();

  const onSubmit = async (data) => {
    console.log(data);
  };

  console.log(errors);

  return (
    <>
      <form
        className="flex flex-col space-y-3"
        onSubmit={handleSubmit(onSubmit)}
      >
        <input
          placeholder="********"
          type="password"
          {...register("password", { required: true, minLength: 8 })}
          aria-invalid={errors.password ? "true" : "false"}
          className="w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
        />
        <input
          placeholder="********"
          type="password"
          {...register("confirmPassword", { required: true, minLength: 8 })}
          className="w-full max-w-md rounded-md border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
        />
        <Button
          text="Reset Password"
          type="submit"
          loading={isLoading}
          disabled={disabled}
        />
      </form>
      {/* {noSuchAccount ? (
        <p className="text-center text-sm text-red-500">
          No such account.{" "}
          <Link href="/register" className="font-semibold text-red-600">
            Sign up
          </Link>{" "}
          instead?
        </p>
      ) : (
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-gray-500 transition-colors hover:text-black"
          >
            Sign up
          </Link>
        </p>
      )} */}
    </>
  );
};
