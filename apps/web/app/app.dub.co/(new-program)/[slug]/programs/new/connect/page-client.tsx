"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const GUIDES = [
  {
    name: "Connecting to Stripe",
    icon: Stripe,
    href: "https://dub.co/docs/conversions/sales/stripe",
  },
  {
    name: "Connecting to Shopify",
    icon: Shopify,
    href: "https://dub.co/docs/conversions/sales/shopify",
  },
] as const;

export function PageClient() {
  const router = useRouter();
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/programs/new/overview`);
      mutate();
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onClick = async () => {
    if (!workspaceId) return;

    setHasSubmitted(true);
    await executeAsync({
      workspaceId,
      step: "connect",
    });
  };

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <p className="text-sm text-neutral-600">
          Depending on your payment processor, select from the following guides
          to learn how to connect Dub and start tracking conversions.
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

      <Button
        text="Continue"
        className="w-full"
        loading={isPending || hasSubmitted}
        type="button"
        onClick={onClick}
      />
    </div>
  );
}
