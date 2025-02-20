"use client";

import { Button } from "@dub/ui";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  // No form fields needed as this is just for navigation
});

type Form = z.infer<typeof formSchema>;

const SECTIONS = [
  {
    title: "Reward",
    content:
      "Earn $10.00 for each conversion, and again for every conversion of the customers lifetime.",
    step: "rewards",
  },
  {
    title: "Referral link structure",
    content: "refer.dub.co/partner-name",
    step: "new",
  },
  {
    title: "Destination URL",
    content: "dub.co",
    step: "new",
  },
] as const;

export function Form() {
  const router = useRouter();
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>();

  const onSubmit = async (data: Form) => {
    console.log(data);
    // TODO: Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {SECTIONS.map(({ title, content, step }) => (
        <div
          key={title}
          className="rounded-lg border border-neutral-200 bg-neutral-50 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-800">
              {title}
            </div>
            <Button
              text={<Pencil className="size-4" />}
              variant="outline"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => router.push(`?step=${step}`)}
            />
          </div>
          <div className="mt-1.5 text-sm font-normal text-neutral-700">
            {content}
          </div>
        </div>
      ))}

      <Button
        text="Create program"
        className="mt-6 w-full"
        loading={isSubmitting}
      />
    </form>
  );
}
