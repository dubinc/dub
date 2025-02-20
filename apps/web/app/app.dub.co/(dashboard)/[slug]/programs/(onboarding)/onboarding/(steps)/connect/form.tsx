"use client";

import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Button } from "@dub/ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  // No form fields needed as this is just for navigation
});

type Form = z.infer<typeof formSchema>;

const GUIDES = [
  {
    name: "Connecting to Stripe",
    icon: Stripe,
    href: "#",
  },
  {
    name: "Connecting to Shopify",
    icon: Shopify,
    href: "#",
  },
] as const;

export function Form() {
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>();

  const onSubmit = async (data: Form) => {
    console.log(data);
    // TODO: Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="space-y-6">
        <p className="text-sm text-neutral-600">
          Ensuring your program is connect is simple, select the best guide that
          suits your connection setup or something else.
        </p>

        <div className="flex flex-col gap-4">
          {GUIDES.map(({ name, icon: Icon, href }) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4"
            >
              <div className="flex items-center gap-3">
                <Icon className="size-8" />
                <span className="text-sm font-medium text-neutral-900">
                  {name}
                </span>
              </div>
              <Button
                text="Read guide"
                variant="secondary"
                className="h-8 w-fit px-3"
              />
            </div>
          ))}
        </div>
      </div>

      <Button text="Continue" className="w-full" loading={isSubmitting} />
    </form>
  );
}
