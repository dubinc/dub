"use client";

import { Button, Crown, DubProductIcon } from "@dub/ui";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";
import { useOnboardingProgress } from "../../use-onboarding-progress";

const products = {
  links: {
    image: "https://assets.dub.co/icons/link.webp",
    title: "Dub Links",
    description: "Short link management, analytics, QR codes, and tracking.",
    paidPlanRequired: false,
  },
  partners: {
    image: "https://assets.dub.co/icons/trophy.webp",
    title: "Dub Partners",
    description: (
      <>
        Manage a partner program with tracking, plus{" "}
        <a
          href="https://dub.co/links"
          target="_blank"
          className="cursor-help font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
        >
          all short link features
        </a>
        .
      </>
    ),
    paidPlanRequired: true,
  },
};

export function ProductSelector() {
  const searchParams = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");

  return (
    <div className="animate-fade-in mx-auto grid w-full max-w-[312px] gap-4 sm:max-w-[600px] sm:grid-cols-2">
      {Object.entries(products).map(([key, product]) => (
        <ProductOption
          key={key}
          product={key as "links" | "partners"}
          icon={product.image}
          title={
            <span className="flex items-center justify-center gap-2">
              <DubProductIcon product={key as "links" | "partners"} />{" "}
              {product.title}
            </span>
          }
          description={product.description}
          cta={`Continue with ${product.title}`}
          paidPlanRequired={product.paidPlanRequired}
        />
      ))}
    </div>
  );
}

function ProductOption({
  product,
  icon,
  title,
  description,
  cta,
  paidPlanRequired,
}: {
  product: "links" | "partners";
  icon: string;
  title: ReactNode;
  description: ReactNode;
  cta: string;
  paidPlanRequired?: boolean;
}) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  return (
    <div className="relative flex h-full flex-col items-center gap-6 rounded-xl border border-neutral-300 p-6 pt-12 transition-all">
      {paidPlanRequired && (
        <div className="absolute inset-x-2 top-2 flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
          <Crown className="size-3" />
          Paid plan required
        </div>
      )}
      <div className="relative size-36">
        <Image
          src={icon}
          alt=""
          fill
          className="object-contain"
          fetchPriority="high"
        />
      </div>
      <div className="space-y-2 text-center">
        <span className="text-base font-semibold text-neutral-900">
          {title}
        </span>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <div className="flex w-full grow flex-col justify-end gap-2">
        <Button
          type="button"
          variant="primary"
          className="rounded-lg"
          onClick={() => continueTo("domain", { params: { product } })}
          loading={isLoading || isSuccessful}
          text={cta}
        />
      </div>
    </div>
  );
}
