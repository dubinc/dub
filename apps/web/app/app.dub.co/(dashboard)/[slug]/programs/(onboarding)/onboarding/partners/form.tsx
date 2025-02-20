"use client";

import { Button, CircleCheckFill, Input } from "@dub/ui";
import { cn } from "@dub/utils";
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
      partners: [{ email: "", referralLink: "refer.dub.co/steven" }],
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
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">
          Invite new partners in addition to those being imported.
        </p>

        <div className="mt-10 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-blue-600">
              <CircleCheckFill className="size-4 text-white" />
            </div>
            <span className="text-sm font-medium text-neutral-800">
              Affiliates importing
            </span>
          </div>
          <span className="text-sm font-medium text-neutral-800">12</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        <div className="flex flex-col gap-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
            >
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
                <div className="mt-2 flex gap-2">
                  <select
                    {...register(`partners.${index}.referralLink`, {
                      required: true,
                    })}
                    className={cn(
                      "flex-1 rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
                    )}
                  >
                    <option value="refer.dub.co/steven">
                      refer.dub.co/steven
                    </option>
                    <option value="refer.dub.co/stevens">
                      refer.dub.co/stevens
                    </option>
                  </select>
                  {index > 0 && (
                    <Button
                      variant="outline"
                      icon={<Trash2 className="size-4" />}
                      className="h-10 w-10 shrink-0 p-0"
                      onClick={() => remove(index)}
                    />
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
                append({ email: "", referralLink: "refer.dub.co/steven" });
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

        <Button
          text="Continue"
          className="w-full"
          loading={isSubmitting}
          disabled={!isValid || isSubmitting}
        />
      </form>
    </div>
  );
}
