"use client";

import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { Button, Crown, DubProductIcon } from "@dub/ui";
import Image from "next/image";
import { ReactNode } from "react";
import { useOnboardingProgress } from "../../use-onboarding-progress";

const products = {
  links: {
    image: "https://assets.dub.co/icons/link.webp",
    title: "Dub Links",
    href: "https://dub.co/links",
    description:
      "[Short links](https://dub.co/help/category/link-management), [QR codes](https://dub.co/help/article/custom-qr-codes), [real-time analytics](https://dub.co/help/article/dub-analytics), and [conversion tracking](https://dub.co/docs/conversions/quickstart).",
    paidPlanRequired: false,
  },
  partners: {
    image: "https://assets.dub.co/icons/trophy.webp",
    title: "Dub Partners",
    href: "https://dub.co/partners",
    description:
      "Modern [affiliate programs](https://dub.co/partners) with [global payouts](https://dub.co/help/article/partner-payouts) and [accurate attribution](https://dub.co/help/article/program-analytics).",
    paidPlanRequired: true,
  },
};

export function ProductSelector() {
  return (
    <div className="animate-fade-in mx-auto grid w-full max-w-[312px] gap-4 sm:max-w-[600px] sm:grid-cols-2">
      {Object.entries(products).map(([key, product]) => (
        <ProductOption
          key={key}
          product={key as "links" | "partners"}
          icon={product.image}
          title={
            <a
              href={product.href}
              target="_blank"
              className="group flex items-center justify-center gap-2"
            >
              <DubProductIcon
                product={key as "links" | "partners"}
                className="transition-transform group-hover:-rotate-12 group-hover:scale-110"
              />{" "}
              {product.title}
            </a>
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
  description: string;
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
        <MarkdownDescription className="text-sm text-neutral-500">
          {description}
        </MarkdownDescription>
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
