"use client";

import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { Button, Crown, DubProductIcon, type Icon } from "@dub/ui";
import { capitalize } from "@dub/utils";
import { usePlausible } from "next-plausible";
import Image from "next/image";
import { ReactNode } from "react";
import { useOnboardingProgress } from "../../use-onboarding-progress";

const products = {
  partners: {
    image: "https://assets.dub.co/cms/trophy.webp",
    title: "Dub Partners",
    href: "https://dub.co/partners",
    planLabel: "Paid plan required",
    planIcon: Crown,
    description:
      "Modern [affiliate programs](https://dub.co/partners) with [global payouts](https://dub.co/help/article/partner-payouts) and [accurate attribution](https://dub.co/help/article/program-analytics).",
  },
  links: {
    image: "https://assets.dub.co/cms/link.webp",
    title: "Dub Links",
    href: "https://dub.co/links",
    planLabel: "Free plan available",
    planIcon: undefined,
    description:
      "[Short links](https://dub.co/help/category/link-management), [QR codes](https://dub.co/help/article/custom-qr-codes), [real-time analytics](https://dub.co/help/article/dub-analytics), and [conversion tracking](https://dub.co/docs/conversions/quickstart).",
  },
};

export function ProductSelector() {
  return (
    <div className="animate-fade-in mx-auto grid w-full gap-4 sm:max-w-[600px] sm:grid-cols-2">
      {Object.entries(products).map(([key, product]) => (
        <ProductOption
          key={key}
          product={key as "links" | "partners"}
          icon={product.image}
          planLabel={product.planLabel}
          planIcon={product.planIcon}
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
        />
      ))}
    </div>
  );
}

function ProductOption({
  product,
  icon,
  planLabel,
  planIcon: PlanIcon,
  title,
  description,
  cta,
}: {
  product: "links" | "partners";
  icon: string;
  planLabel: string;
  planIcon?: Icon;
  title: ReactNode;
  description: string;
  cta: string;
}) {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();
  const plausible = usePlausible();
  return (
    <div className="relative flex h-full flex-col items-center rounded-xl border border-neutral-200 bg-white p-3 transition-all">
      <div className="relative flex h-52 w-full items-center justify-center rounded-xl bg-neutral-50">
        <div className="absolute inset-x-2 top-2 flex h-6 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-600">
          {PlanIcon && <PlanIcon className="size-3.5 text-neutral-900" />}
          {planLabel}
        </div>
        <div className="relative mt-8 size-32">
          <Image
            src={icon}
            alt=""
            fill
            className="object-contain"
            fetchPriority="high"
          />
        </div>
      </div>
      <div className="p-2">
        <div className="mt-2 space-y-3 text-center">
          <span className="text-base font-semibold text-neutral-900">{title}</span>
          <MarkdownDescription className="text-sm leading-snug text-neutral-500">
            {description}
          </MarkdownDescription>
        </div>
        <div className="mt-6 flex w-full grow flex-col justify-end">
          <Button
            type="button"
            variant="primary"
            className="h-10 rounded-lg text-sm"
            onClick={() => {
              plausible("Selected Product", {
                props: {
                  product: capitalize(product),
                },
              });
              continueTo("domain", { params: { product } });
            }}
            loading={isLoading || isSuccessful}
            text={cta}
          />
        </div>
      </div>
    </div>
  );
}
