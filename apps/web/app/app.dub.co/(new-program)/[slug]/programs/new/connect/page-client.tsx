"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Button } from "@dub/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

export function PageClient() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();

  const onClick = async () => {
    if (!workspaceId) return;
    setIsPending(true);
    router.push(`/${workspaceSlug}/programs/new/overview`);
  };

  return (
    <div className="space-y-10">
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

      <Button
        text="Continue"
        className="w-full"
        loading={isPending}
        type="button"
        onClick={onClick}
      />
    </div>
  );
}
