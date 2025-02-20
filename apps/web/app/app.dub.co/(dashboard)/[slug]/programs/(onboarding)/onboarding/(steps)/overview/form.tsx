"use client";

import { Button } from "@dub/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  //
});

type Form = z.infer<typeof formSchema>;

export function Form() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isValid },
    watch,
  } = useForm<Form>({});

  const onSubmit = async (data: Form) => {
    console.log(data);
    // TODO: Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting}
        disabled={!isValid || isSubmitting}
      />
    </form>
  );
}
