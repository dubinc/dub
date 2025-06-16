"use client";

import { onboardProgramAction } from "@/lib/actions/partners/onboard-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { Shopify } from "@/ui/layout/sidebar/conversions/icons/shopify";
import { Stripe } from "@/ui/layout/sidebar/conversions/icons/stripe";
import { Button, ToggleGroup } from "@dub/ui";
import { Framer } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type IntegrationType = "no-code" | "code";

type Guide = {
  type: IntegrationType;
  title: string;
  description?: string;
  icon: JSX.Element;
  recommended?: boolean;
};

const guides: Guide[] = [
  {
    type: "no-code",
    title: "Framer",
    description: "Dub Analytics",
    icon: <Framer />,
    recommended: true,
  },
  {
    type: "no-code",
    title: "Shopify",
    description: "Dub Analytics",
    icon: <Shopify />,
  },
  {
    type: "no-code",
    title: "Webflow",
    description: "Dub Analytics",
    icon: <Stripe />,
  },
  {
    type: "code",
    title: "WordPress",
    description: "Dub Analytics",
    icon: <Shopify />,
  },
];

export function PageClient() {
  const router = useRouter();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { id: workspaceId, slug: workspaceSlug, mutate } = useWorkspace();
  const [integrationType, setIntegrationType] =
    useState<IntegrationType>("no-code");

  const { executeAsync, isPending } = useAction(onboardProgramAction, {
    onSuccess: () => {
      router.push(`/${workspaceSlug}/program/new/overview`);
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
          Ensure your program is connected to your website, so you can track
          your clicks, leads, and sales on your program.
        </p>

        <div className="flex flex-col gap-4">
          <ToggleGroup
            className="flex w-full items-center gap-1 rounded-md border border-neutral-200 bg-neutral-100 p-1"
            optionClassName="h-8 flex items-center justify-center rounded-md flex-1 text-sm font-medium transition-colors text-neutral-800"
            indicatorClassName="bg-white shadow border-none rounded-md"
            options={[
              { value: "no-code", label: "No-code integrations" },
              { value: "code", label: "Developer integrations" },
            ]}
            selected={integrationType}
            selectAction={(id: IntegrationType) => setIntegrationType(id)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {guides
          .filter((g) => g.type === integrationType)
          .map((guide) => (
            <div
              key={guide.title}
              className="group relative flex h-40 flex-col justify-center rounded-lg bg-neutral-200/40 transition-colors duration-100 hover:bg-neutral-200/60"
            >
              {guide.recommended && (
                <span className="absolute left-4 top-4 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Recommended
                </span>
              )}

              <div className="mb-4 flex h-16 items-center justify-center">
                {guide.icon}
              </div>

              <div className="text-center">
                <div className="text-sm font-semibold text-[##171717]">
                  {guide.title}
                </div>
                <div className="text-sm font-medium text-[#737373]">
                  {guide.description}
                </div>
              </div>
            </div>
          ))}
      </div>

      <Button
        text="I'll do this later"
        variant="secondary"
        className="w-full"
        loading={isPending || hasSubmitted}
        type="button"
        onClick={onClick}
      />
    </div>
  );
}
