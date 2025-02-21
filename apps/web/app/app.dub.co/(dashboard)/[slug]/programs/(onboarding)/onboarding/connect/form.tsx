"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
const GUIDES = [
  {
    name: "Connecting to Stripe",
    icon: Stripe,
    href: "https://d.to/stripe",
  },
  {
    name: "Connecting to Shopify",
    icon: Shopify,
    href: "https://d.to/shopify",
  },
] as const;

export function Form() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/programs/onboarding/overview`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    if (!workspaceId) return;

    await executeAsync({
      workspaceId,
      step: "connect-dub",
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-10">
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
              <Link href={href} target="_blank" rel="noopener noreferrer">
                <Button
                  type="button"
                  text="Read guide"
                  variant="secondary"
                  className="h-8 w-fit px-3"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <Button text="Continue" className="w-full" loading={isPending} />
    </form>
  );
}
