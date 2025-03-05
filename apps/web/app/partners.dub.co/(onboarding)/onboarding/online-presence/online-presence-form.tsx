"use client";

import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";

export function OnlinePresenceForm({ country }: { country: string | null }) {
  const router = useRouter();

  const {
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
  } = useForm();

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(() =>
        router.push(country === "US" ? "/onboarding/verify" : "/programs"),
      )}
      className="flex w-full flex-col gap-4 text-left"
    >
      WIP
      <Button
        type="submit"
        text="Continue"
        className="mt-2"
        loading={isSubmitting || isSubmitSuccessful}
      />
    </form>
  );
}
