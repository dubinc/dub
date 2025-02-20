"use client";

import { Button, Input } from "@dub/ui";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  partners: z
    .array(
      z.object({
        email: z.string().email("Please enter a valid email"),
        referralLink: z.string().min(1, "Please enter a referral link"),
      }),
    )
    .min(1, "Add at least one partner"),
});

type Form = z.infer<typeof formSchema>;

export function Form() {
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<Form>({
    defaultValues: {
      partners: [{ email: "", referralLink: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    name: "partners",
    control,
  });

  const onSubmit = async (data: Form) => {
    console.log(data);
    // TODO: Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-800">
                {index === 0 && "Email"}
              </label>
              <Input
                {...register(`partners.${index}.email`, { required: true })}
                type="email"
                placeholder="panic@thedis.co"
                className="mt-2"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-800">
                {index === 0 && "Referral link"}
              </label>
              <div className="relative mt-2">
                <Input
                  {...register(`partners.${index}.referralLink`, {
                    required: true,
                  })}
                  placeholder="refer.dub.co/steven"
                />
                {index > 0 && (
                  <div className="absolute -right-12 top-1/2 -translate-y-1/2">
                    <Button
                      variant="outline"
                      icon={<Trash2 className="size-4" />}
                      className="h-10 w-10 p-0"
                      onClick={() => remove(index)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <Button
          text="Add partner"
          variant="secondary"
          icon={<Plus className="size-4" />}
          className="w-fit"
          onClick={() => {
            if (fields.length < 10) {
              append({ email: "", referralLink: "" });
            }
          }}
          disabled={fields.length >= 10}
        />
        {fields.length >= 10 && (
          <p className="text-sm text-neutral-600">
            You can add up to 10 partners at a time
          </p>
        )}
      </div>

      <div className="flex items-center gap-4"></div>

      <Button
        text="Continue"
        className="w-full"
        loading={isSubmitting}
        disabled={!isValid || isSubmitting}
      />
    </form>
  );
}
